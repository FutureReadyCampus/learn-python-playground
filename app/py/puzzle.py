"""파이썬 퍼즐 실행기 (규칙의 유일한 기준).

사용자 코드를 진짜 Python으로 끝까지 돌리면서 일어난 일을 기록(actions)해 JSON으로 돌려준다.
화면(JS)은 이 기록을 받아 3D로 재생만 한다. JS에는 규칙이 없다.

기록 형식 (모두 'ln' = 사용자 코드 줄 번호, 'a' = 캐릭터 번호, 0이 주인공):
  move  {a, from, to, tele?}    turn  {a, s(+1 오른쪽/-1 왼쪽), d}   bump {a, d}
  gem   {a, at}                 sw    {a, at, on}
  portal{k, on}                 lock  {up, plats:[{at,h}]}
  place {kind, at, h, facing?, color?, k?}    spawn {a, kind, at, d}   print {s}
"""
import ast
import io
import json
import sys

DIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]          # 북 동 남 서
CMDS = {'move_forward': 'move', 'turn_left': 'left', 'turn_right': 'right',
        'collect_gem': 'gem', 'toggle_switch': 'sw'}
LABEL = {'move': 'move_forward()', 'left': 'turn_left()', 'right': 'turn_right()',
         'gem': 'collect_gem()', 'sw': 'toggle_switch()', 'for': 'for 반복문',
         'while': 'while 반복문', 'if': 'if 조건문', 'def': 'def 함수', 'var': '변수',
         'augassign': '+= 같은 값 바꾸기', 'def_args': '매개변수가 있는 함수',
         'for_list': '리스트를 도는 for', 'else': 'else / elif', 'not': 'not', 'and': 'and',
         'or': 'or', 'compare': '비교 연산 (==, <, >=)', 'attr': '속성에 값 넣기 (a.b = 값)',
         'obj': '객체 만들기 (Expert() 등)', 'method': '객체의 메서드 부르기', 'kwargs': '이름을 붙인 인자 (이름=값)',
         'default': '기본값이 있는 매개변수', 'list': '리스트 [ ... ]', 'append': 'append', 'remove': 'remove / pop',
         'index': '인덱스 [ ] 로 꺼내기', 'class': 'class', 'break': 'break', 'continue': 'continue',
         'fstring': 'f-string', 'listcomp': '리스트 컴프리헨션', 'dict': 'dict', 'place': 'world.place()',
         'range_list': 'list(range())', 'print': 'print()', 'try': 'try / except', 'with': 'with', 'open': 'open()',
         'except_named': 'except 오류이름', 'cast': '형 변환 (int(), str() 등)', 'return': 'return으로 값 돌려주기', 'global': 'global', 'method_def': '클래스 안의 메서드', 'worldattr': 'world의 속성 읽기 (world.column_count 등)',
         'def_calls_def': '함수 안에서 다른 함수 부르기', 'def_args2': '매개변수가 두 개 이상인 함수'}
# 레슨의 tools 에 들어 있어야만 쓸 수 있는 문법
GATED = {'move', 'left', 'right', 'gem', 'sw', 'for', 'while', 'if', 'def', 'var', 'try', 'with',
         'class', 'break', 'continue', 'fstring', 'listcomp', 'dict'}
OBJ_NAMES = {'Expert', 'Character', 'Portal', 'Block', 'Stair', 'Gem', 'Switch', 'Coordinate'}
PORTAL_COLORS = ['orange', 'blue', 'green']          # 포털 쌍 (a b) (c d) (e f)
MAX_ACTIONS = 1500
MAX_LINES = 300_000
USER = '<user>'


class PuzzleError(Exception):
    pass


def user_line():
    """지금 실행 중인 사용자 코드의 줄 번호 (함수 안이면 그 함수 안의 줄)."""
    f = sys._getframe()
    while f:
        if f.f_code.co_filename == USER:
            return f.f_lineno
        f = f.f_back
    return 0


class Coordinate:
    def __init__(self, column, row):
        self.column, self.row = column, row

    def __repr__(self):
        return f'Coordinate(column={self.column}, row={self.row})'

    def __eq__(self, o):
        return isinstance(o, Coordinate) and (self.column, self.row) == (o.column, o.row)

    def __hash__(self):
        return hash((self.column, self.row))


class Item:
    kind = ''

    def __init__(self, *a, **k):
        pass


class Block(Item):
    kind = 'block'


class Stair(Item):
    kind = 'stair'


class Gem(Item):
    kind = 'gem'


class Switch(Item):
    kind = 'switch'


class Portal(Item):
    kind = 'portal'

    def __init__(self, color='blue'):
        if color not in PORTAL_COLORS:
            raise PuzzleError(f'포털 색은 {", ".join(PORTAL_COLORS)} 중에서 골라요 (지금 {color!r})')
        object.__setattr__(self, 'color', color)
        object.__setattr__(self, '_w', None)
        object.__setattr__(self, 'k', None)
        object.__setattr__(self, '_active', True)

    @property
    def is_active(self):
        return self._active

    @is_active.setter
    def is_active(self, v):
        object.__setattr__(self, '_active', bool(v))
        if self._w and self.k:
            self._w.record('portal', k=self.k, on=bool(v))


class Actor:
    def __init__(self, aid, kind, x, z, d):
        self.id, self.kind, self.x, self.z, self.d = aid, kind, x, z, d


class World:
    def __init__(self, spec):
        self.spec = spec
        self.H = [list(r) for r in spec['H']]
        self.rows, self.cols = len(self.H), len(self.H[0])
        x, z, d = spec['start']
        self.actors = [Actor(0, 'hero', x, z, d)]
        self.slots = [tuple(s) for s in spec.get('slots') or []]     # (x, z, 방향) 또는 (x, z, 방향, 'expert'/'character')
        self.gems = {tuple(g) for g in spec['gems']}
        self.init_gems = len(self.gems)
        self.sws = {tuple(int(n) for n in k.split(',')) for k in spec['sws']}
        self.on = set()
        self.collected = 0
        self.placed = 0
        self.moves = 0
        self.turns = 0
        self.built = 0
        self.plats = [{'at': tuple(p['at']), 'lo': self.H[p['at'][1]][p['at'][0]], 'hi': p['hi']}
                      for p in spec.get('plats') or []]
        self.actions = []
        self.files = dict(spec.get('files') or {})    # 레슨 안의 가상 파일 {이름: 내용}
        self.portals = []                              # Portal 객체 목록
        for i, (k, at) in enumerate(sorted(spec['portals'].items())):
            p = Portal(PORTAL_COLORS[(ord(k) - 97) // 2])
            p.k, p._w, p.at = k, self, tuple(at)
            if k in (spec.get('portals_off') or []):
                object.__setattr__(p, '_active', False)
            self.portals.append(p)
        self.hero_hint = None

    # ── 기록 ──
    def record(self, t, **kw):
        if len(self.actions) >= MAX_ACTIONS:
            raise PuzzleError('동작이 너무 많아요. 무한 반복인지 확인해 보세요')
        self.actions.append({'t': t, 'ln': user_line(), **kw})

    # ── 지형 ──
    def h(self, x, z):
        return self.H[z][x] if 0 <= z < self.rows and 0 <= x < self.cols else 0

    def blocked(self, a, d=None):
        dx, dz = DIRS[a.d if d is None else d]
        h = self.h(a.x + dx, a.z + dz)
        return not h or abs(h - self.h(a.x, a.z)) > 1

    # ── 캐릭터 동작 ──
    def move(self, a):
        if self.blocked(a):
            self.record('bump', a=a.id, d=a.d)
            raise PuzzleError('앞이 막혀 있어요')
        dx, dz = DIRS[a.d]
        frm = [a.x, a.z]
        a.x, a.z = a.x + dx, a.z + dz
        step, tele = [a.x, a.z], None
        for p in self.portals:
            if p.at == (a.x, a.z):
                dest = next((q for q in self.portals if q is not p and q.color == p.color), None)
                if dest and p.is_active and dest.is_active:
                    a.x, a.z = dest.at
                    tele = [a.x, a.z]
                break
        self.moves += 1
        self.record('move', a=a.id, to=step, tele=tele, **{'from': frm})

    def turn(self, a, s):
        a.d = (a.d + (1 if s > 0 else 3)) % 4
        self.turns += 1
        self.record('turn', a=a.id, s=1 if s > 0 else -1, d=a.d)

    def collect(self, a):
        if (a.x, a.z) not in self.gems:
            self.record('gem', a=a.id, at=[a.x, a.z], ok=False)
            raise PuzzleError('여기엔 보석이 없어요')
        self.gems.remove((a.x, a.z))
        self.collected += 1
        self.record('gem', a=a.id, at=[a.x, a.z], ok=True)

    def toggle(self, a):
        k = (a.x, a.z)
        if k not in self.sws:
            self.record('sw', a=a.id, at=[a.x, a.z], on=False, ok=False)
            raise PuzzleError('여기엔 스위치가 없어요')
        self.on ^= {k}
        self.record('sw', a=a.id, at=list(k), on=k in self.on, ok=True)

    def lock(self, up):
        for p in self.plats:
            x, z = p['at']
            self.H[z][x] = p['hi'] if up else p['lo']
        self.record('lock', up=up, plats=[{'at': list(p['at']), 'h': self.H[p['at'][1]][p['at'][0]]} for p in self.plats])

    def spawn(self, kind):
        i = next((i for i, s in enumerate(self.slots) if len(s) > 3 and s[3] == kind), None)
        if i is None:
            i = next((i for i, s in enumerate(self.slots) if len(s) == 3), None)
        if i is None:
            raise PuzzleError('이 퍼즐에는 더 부를 수 있는 캐릭터가 없어요')
        x, z, d = self.slots.pop(i)[:3]
        a = Actor(len(self.actors), kind, x, z, d)
        self.actors.append(a)
        self.record('spawn', a=a.id, kind=kind, at=[x, z], d=d)
        return a

    # ── 세상 만들기 ──
    def place(self, item, at_column=None, row=None, facing=None, at=None):
        if not isinstance(item, Item):
            raise PuzzleError('world.place() 에는 Block(), Gem() 같은 물건을 넣어요')
        if at is not None:
            at_column, row = at.column, at.row
        if at_column is None or row is None:
            raise PuzzleError('놓을 칸을 알려 주세요. 예: at_column=2, row=1')
        if not (isinstance(at_column, int) and isinstance(row, int) and 0 <= at_column < self.cols and 0 <= row < self.rows):
            raise PuzzleError(f'세상 안의 칸이 아니에요 (column 0~{self.cols - 1}, row 0~{self.rows - 1})')
        x, z, k = at_column, row, item.kind
        self.built += 1
        if k in ('block', 'stair'):
            if self.H[z][x] >= 4:
                raise PuzzleError('더는 쌓을 수 없어요 (최대 4칸)')
            self.H[z][x] += 1
            extra = {'facing': facing} if k == 'stair' else {}
            self.record('place', kind=k, at=[x, z], h=self.H[z][x], **extra)
        elif k == 'portal':
            if self.H[z][x] == 0:
                raise PuzzleError('포털은 땅 위에만 놓을 수 있어요')
            if item.k:
                raise PuzzleError('이 포털은 이미 놓았어요')
            item.k, item._w, item.at = f'p{len(self.portals)}', self, (x, z)
            self.portals.append(item)
            self.record('place', kind='portal', at=[x, z], h=self.H[z][x], color=item.color, k=item.k)
        elif k in ('gem', 'switch'):
            if self.H[z][x] == 0:
                raise PuzzleError('그 칸은 비어 있어요. 먼저 Block()을 놓아요')
            (self.gems if k == 'gem' else self.sws).add((x, z))
            self.placed += 1
            self.record('place', kind=k, at=[x, z], h=self.H[z][x])
        else:
            raise PuzzleError('놓을 수 없는 물건이에요')

    def all_coordinates(self):
        return [Coordinate(x, z) for z in range(self.rows) for x in range(self.cols) if self.H[z][x]]

    # ── 목표 ──
    def done(self):
        g = self.spec.get('goal') or {}
        if not (self.collected or self.on or self.placed):
            return False
        ok = self.collected >= g.get('collect', self.init_gems) and len(self.on) >= g.get('switches', len(self.spec['sws']))
        if g.get('all', True):
            ok = ok and not self.gems
        if 'build' in g:                                # 직접 놓은 물건의 개수
            ok = ok and self.built >= g['build']
        if g.get('off'):                               # 건드리면 안 되는 스위치
            ok = ok and all(tuple(c) not in self.on for c in g['off'])
        if 'height' in g:                               # {at:[x,z], h:n} 모두 만족
            ok = ok and all(self.h(*c['at']) >= c['h'] for c in g['height'])
        return ok


class ActorAPI:
    """Expert() / Character() 가 돌려주는 도우미. 주인공은 같은 이름의 함수로 직접 부른다."""
    def __init__(self, w, a):
        object.__setattr__(self, '_w', w)
        object.__setattr__(self, '_a', a)

    def move_forward(self):
        self._w.move(self._a)

    def turn_left(self):
        self._w.turn(self._a, -1)

    def turn_right(self):
        self._w.turn(self._a, 1)

    def collect_gem(self):
        self._w.collect(self._a)

    def toggle_switch(self):
        self._w.toggle(self._a)

    def is_on_gem(self):
        return (self._a.x, self._a.z) in self._w.gems

    def is_on_closed_switch(self):
        k = (self._a.x, self._a.z)
        return k in self._w.sws and k not in self._w.on

    def is_blocked(self):
        return self._w.blocked(self._a)

    def is_blocked_left(self):
        return self._w.blocked(self._a, (self._a.d + 3) % 4)

    def is_blocked_right(self):
        return self._w.blocked(self._a, (self._a.d + 1) % 4)


class ExpertAPI(ActorAPI):
    def turn_lock_up(self):
        self._w.lock(True)

    def turn_lock_down(self):
        self._w.lock(False)


class WorldAPI:
    def __init__(self, w):
        self._w = w

    column_count = property(lambda s: s._w.cols)
    row_count = property(lambda s: s._w.rows)

    def place(self, item, at_column=None, row=None, facing=None, at=None):
        self._w.place(item, at_column, row, facing, at)

    def all_coordinates(self):
        return self._w.all_coordinates()


class VFile(io.StringIO):
    """레슨 안의 가상 파일. 'r' 은 읽기, 'w' 는 새로 쓰기, 'a' 는 이어 쓰기. 닫힐 때 내용이 world 에 남아요."""
    def __init__(self, w, name, mode):
        self._w, self._name, self._mode = w, name, mode
        super().__init__(w.files.get(name, '') if mode in ('r', 'a') else '')
        if mode == 'a':
            self.seek(0, 2)

    def close(self):
        if not self.closed and self._mode in ('w', 'a'):
            self._w.files[self._name] = self.getvalue()
            self._w.record('file', name=self._name, s=self.getvalue())
        super().close()


def vopen(w):
    def open_(name, mode='r', encoding=None, **_):
        mode = mode.replace('t', '')
        if mode not in ('r', 'w', 'a'):
            raise PuzzleError("파일은 'r'(읽기), 'w'(쓰기), 'a'(이어 쓰기)로만 열 수 있어요")
        if mode == 'r' and name not in w.files:
            raise FileNotFoundError(f"'{name}' 파일이 없어요")
        f = VFile(w, name, mode)
        if mode == 'r':
            f.write = None                        # 읽기용 파일에는 쓸 수 없어요
        return f
    return open_


def build_api(w):
    hero = ActorAPI(w, w.actors[0])
    names = {n: getattr(hero, n) for n in
             ('move_forward', 'turn_left', 'turn_right', 'collect_gem', 'toggle_switch', 'is_on_gem',
              'is_on_closed_switch', 'is_blocked', 'is_blocked_left', 'is_blocked_right')}
    names['open'] = vopen(w)
    names['print'] = lambda *a, sep=' ', **_: w.record('print', s=sep.join(map(str, a)))
    names.update(world=WorldAPI(w), Block=Block, Stair=Stair, Gem=Gem, Switch=Switch, Portal=Portal,
                 Coordinate=Coordinate, NORTH=0, EAST=1, SOUTH=2, WEST=3,
                 Expert=lambda: ExpertAPI(w, w.spawn('expert')),
                 Character=lambda: ActorAPI(w, w.spawn('character')))
    for p in w.portals:
        if len(p.k) == 1:
            names['portal_' + p.k] = p
    return names


# ── 실행 전 검사: 레슨에서 쓸 수 있는 문법, 꼭 써야 하는 문법, 명령 개수 ──
def count_stmts(tree):
    return sum(isinstance(n, ast.stmt) and not isinstance(n, ast.Pass) for n in ast.walk(tree))


def kinds_of(n, defined):
    """AST 노드 하나가 사용한 문법 종류들을 (gated, extra) 로 돌려준다."""
    gated, extra = [], []
    if isinstance(n, ast.For):
        gated.append('for')
        it = n.iter
        if not (isinstance(it, ast.Call) and isinstance(it.func, ast.Name) and it.func.id == 'range'):
            extra.append('for_list')
    elif isinstance(n, ast.While):
        gated.append('while')
    elif isinstance(n, ast.If):
        gated.append('if')
        if n.orelse:
            extra.append('else')
    elif isinstance(n, ast.FunctionDef):
        gated.append('def')
        if any(isinstance(c, ast.Call) and isinstance(c.func, ast.Name) and c.func.id in defined and c.func.id != n.name
               for c in ast.walk(n)):
            extra.append('def_calls_def')
        if n.args.args:
            extra.append('def_args')
        if len(n.args.args) >= 2:
            extra.append('def_args2')
        if n.args.defaults:
            extra.append('default')
    elif isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
        tg = n.targets if isinstance(n, ast.Assign) else [n.target]
        v = getattr(n, 'value', None)
        makes_obj = isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id in OBJ_NAMES
        if any(isinstance(t, ast.Attribute) for t in tg):
            extra.append('attr')
        elif not makes_obj:                            # helper = Expert() 는 변수 문법이 아니라 객체 만들기
            gated.append('var')
        if isinstance(n, ast.AugAssign):
            extra.append('augassign')
    elif isinstance(n, ast.ClassDef):
        gated.append('class')
        if any(isinstance(b, ast.FunctionDef) for b in n.body):
            extra.append('method_def')
    elif isinstance(n, ast.Try):
        gated.append('try')
        if any(h.type is not None for h in n.handlers):
            extra.append('except_named')
    elif isinstance(n, ast.With):
        gated.append('with')
    elif isinstance(n, ast.Return) and n.value is not None:
        extra.append('return')
    elif isinstance(n, ast.Global):
        extra.append('global')
    elif isinstance(n, ast.Break):
        gated.append('break')
    elif isinstance(n, ast.Continue):
        gated.append('continue')
    elif isinstance(n, ast.JoinedStr):
        gated.append('fstring')
    elif isinstance(n, ast.ListComp):
        gated.append('listcomp')
    elif isinstance(n, (ast.Dict, ast.DictComp)):
        gated.append('dict')
    elif isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.Not):
        extra.append('not')
    elif isinstance(n, ast.BoolOp):
        extra.append('and' if isinstance(n.op, ast.And) else 'or')
    elif isinstance(n, ast.Compare):
        extra.append('compare')
    elif isinstance(n, ast.List):
        extra.append('list')
    elif isinstance(n, ast.Subscript):
        extra.append('index')
    elif isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id == 'world' and n.attr != 'place':
        extra.append('worldattr')
    elif isinstance(n, ast.Call):
        f = n.func
        if isinstance(f, ast.Name):
            if f.id in defined:                        # 학생이 같은 이름으로 만든 함수(def turn_right)가 먼저
                gated.append('def')
            elif f.id in CMDS:
                gated.append(CMDS[f.id])
            elif f.id in OBJ_NAMES:
                extra.append('obj')
            elif f.id == 'print':
                extra.append('print')
            elif f.id == 'open':
                extra.append('open')
            elif f.id in ('int', 'str', 'float', 'bool'):
                extra.append('cast')
            elif f.id == 'list' and n.args and isinstance(n.args[0], ast.Call):
                extra.append('range_list')
        elif isinstance(f, ast.Attribute):
            if f.attr == 'place':
                extra.append('place')
            elif f.attr == 'append':
                extra.append('append')
            elif f.attr in ('remove', 'pop'):
                extra.append('remove')
            else:
                extra.append('method')
        if n.keywords and not (isinstance(f, ast.Name) and f.id == 'print'):
            extra.append('kwargs')
    return gated, extra


def static_check(tree, spec):
    tools, used = set(spec['tools']), set()
    defined = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    for n in ast.walk(tree):
        gated, extra = kinds_of(n, defined)
        used.update(extra)
        for kind in gated:
            if kind in GATED and kind not in tools:
                return {'msg': f'이 레슨에서는 {LABEL[kind]}을(를) 쓸 수 없어요', 'line': getattr(n, 'lineno', 0)}
            used.add(kind)
    for k in spec.get('need') or []:
        if k not in used:
            return {'msg': f'이 레슨에서는 {LABEL[k]}을(를) 꼭 써야 해요', 'line': 0}
    n = count_stmts(tree)
    if spec.get('max') and n > spec['max']:
        return {'msg': f'명령은 {spec["max"]}개까지만 쓸 수 있어요 (지금 {n}개)', 'line': 0}
    return None


HINTS = {
    'NameError': '없는 이름을 썼어요. 철자나, 만들기 전에 썼는지 확인해 보세요',
    'TypeError': '함수에 넘긴 값의 개수나 종류가 맞지 않아요',
    'IndexError': '리스트의 범위를 벗어났어요',
    'ZeroDivisionError': '0으로 나눌 수 없어요',
    'UnboundLocalError': '함수 안에서 값을 정하기 전에 변수를 썼어요',
    'AttributeError': '그런 속성이나 메서드는 없어요',
    'RecursionError': '함수가 자기 자신을 끝없이 부르고 있어요',
    'KeyError': '딕셔너리에 없는 이름표예요',
    'ValueError': '값이 알맞지 않아요',
    'FileNotFoundError': '그런 이름의 파일이 없어요. 파일 이름을 확인해 보세요',
    'UnsupportedOperation': '이 파일은 그렇게 쓸 수 없어요 (읽기용인지 쓰기용인지 확인해 보세요)',
}


def error_line(exc):
    line, tb = 0, exc.__traceback__
    while tb:
        if tb.tb_frame.f_code.co_filename == USER:
            line = tb.tb_lineno
        tb = tb.tb_next
    return line


FACING = '북동남서'


def snap(v, depth=0):
    """상태 장면에 보여 줄 값 (JSON으로 바꿀 수 있는 모양). 함수나 모듈은 None."""
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    if depth > 2:
        return '…'
    if isinstance(v, Coordinate):
        return {'coord': [v.column, v.row]}
    if isinstance(v, (list, tuple)):
        return {'list': [snap(x, depth + 1) for x in v[:12]]}
    if isinstance(v, dict):
        return {'dict': {str(k): snap(x, depth + 1) for k, x in list(v.items())[:12]}}
    if isinstance(v, Portal):
        return {'obj': 'Portal', 'attrs': {'color': v.color, 'is_active': v.is_active}}
    if isinstance(v, ActorAPI):
        a = v._a
        return {'obj': 'Expert' if isinstance(v, ExpertAPI) else 'Character',
                'attrs': {'column': a.x, 'row': a.z, 'facing': FACING[a.d]}}
    if isinstance(v, Item):
        return {'obj': type(v).__name__, 'attrs': {}}
    if callable(v) or type(v).__name__ == 'module':
        return None
    if hasattr(v, '__dict__'):
        return {'obj': type(v).__name__, 'attrs': {k: snap(x, depth + 1) for k, x in vars(v).items() if not k.startswith('_')}}
    return repr(v)[:30]


def run_one(spec, tree):
    """맵 하나에서 코드를 실행한다."""
    w = World(spec)
    out = {'actions': w.actions, 'error': None, 'goal_msg': None, 'spec': spec}
    g = {'__name__': '__main__', '__builtins__': __builtins__}
    g.update(build_api(w))
    steps = [0]
    # 상태 장면: spec['watch'] 에 적힌 이름의 값이 바뀔 때마다 {'t':'state', vars} 를 기록한다 (바로 앞에 실행한 줄 번호)
    watch, last, prev = spec.get('watch') or [], {}, [0]

    def emit(scope, ln):
        cur = {n: snap(scope[n]) for n in watch if n in scope}
        cur = {k: v for k, v in cur.items() if v is not None}
        if cur != last:
            last.clear()
            last.update(cur)
            w.actions.append({'t': 'state', 'ln': ln, 'vars': dict(cur)})

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != USER:
            return None
        if event == 'line':
            steps[0] += 1
            if steps[0] > MAX_LINES:
                raise PuzzleError('실행이 너무 길어요. 무한 반복인지 확인해 보세요')
            if watch:
                emit({**g, **frame.f_locals}, prev[0])
                prev[0] = frame.f_lineno
        return tracer

    sys.settrace(tracer)
    try:
        exec(compile(tree, USER, 'exec'), g)
    except PuzzleError as e:
        out['error'] = {'msg': str(e), 'line': error_line(e)}
    except Exception as e:
        name = type(e).__name__
        out['error'] = {'msg': f'{HINTS.get(name, "코드에서 오류가 났어요")} ({name}: {e})', 'line': error_line(e)}
    finally:
        sys.settrace(None)
    if watch:
        emit(g, prev[0])

    out['done'] = bool(w.done()) and not out['error']
    chk = spec.get('check')
    if chk and not out['error']:
        if 'var' in chk:
            got = g.get(chk['var'])
            eq = chk.get('eq', 'collected')
            want = {'collected': w.collected, 'moves': w.moves, 'turns': w.turns,
                    'switches': len(w.on), 'placed': w.placed}[eq] if isinstance(eq, str) else eq
            if got != want:
                out['goal_msg'] = f'{chk["var"]} 값이 {got!r}이에요. {want}와 같아야 해요'
                out['done'] = False
        if 'file' in chk and w.files.get(chk['file']) != chk.get('text'):
            out['goal_msg'] = f'{chk["file"]} 파일의 내용이 알맞지 않아요'
            out['done'] = False
        if 'out' in chk and not any(chk['out'] in a.get('s', '') for a in w.actions if a['t'] == 'print'):
            out['goal_msg'] = f'print()로 "{chk["out"]}"가 들어간 글을 화면에 보여 줘야 해요'
            out['done'] = False
    return out


def run(spec, code):
    """실행 전 검사 → 맵마다(variants 가 있으면 여러 번) 실행. 처음 실패한 맵에서 멈춘다."""
    out = {'static': None, 'n': 0, 'runs': [], 'ok': False}
    try:
        tree = ast.parse(code, USER)
    except SyntaxError as e:
        ko = '들여쓰기가 맞지 않아요' if isinstance(e, IndentationError) else '문법이 맞지 않아요'
        out['static'] = {'msg': f'{ko} ({type(e).__name__}: {e.msg})', 'line': e.lineno or 0}
        return out
    out['n'] = count_stmts(tree)
    out['static'] = static_check(tree, spec)
    if out['static']:
        return out
    base = {k: v for k, v in spec.items() if k != 'variants'}
    for v in [{}] + list(spec.get('variants') or []):        # 기본 맵부터, 그다음 변형 맵들 (화면도 이 순서로 보여 줘요)
        r = run_one({**base, **v}, tree)
        out['runs'].append(r)
        if not r['done']:
            return out
    out['ok'] = True
    return out


# ── 레슨 JSON → 실행용 spec ──
# H: 높이 (숫자 1~4, '.' 은 빈 칸)   O: ^>v< 주인공 시작과 방향, g 보석, o 스위치, a~f 포털 (a b / c d / e f 가 한 쌍)
def parse_map(H, O):
    s = {'H': [[0 if c == '.' else int(c) for c in r] for r in H], 'gems': [], 'sws': [], 'portals': {}, 'start': None}
    for z, row in enumerate(O):
        for x, c in enumerate(row):
            if c in '^>v<':
                s['start'] = [x, z, '^>v<'.index(c)]
            elif c == 'g':
                s['gems'].append([x, z])
            elif c == 'o':
                s['sws'].append(f'{x},{z}')
            elif c in 'abcdef':
                s['portals'][c] = [x, z]
    return s


def parse_lesson(d):
    spec = parse_map(d['H'], d['O'])
    spec.update(tools=d.get('tools', []), max=d.get('max', 0), need=d.get('need', []), check=d.get('check'),
                goal=d.get('win'), plats=d.get('plats', []),
                slots=[[s[0], s[1], '^>v<'.index(s[2])] + s[3:] for s in d.get('slots', [])],
                portals_off=d.get('portals_off', []), watch=d.get('watch', []), files=d.get('files', {}))
    if d.get('variants'):
        spec['variants'] = [{**parse_map(v['H'], v['O']), **({'plats': v['plats']} if 'plats' in v else {}), **({'goal': v['win']} if 'win' in v else {}),
                             **({'check': v['check']} if 'check' in v else {}),
                             **({'slots': [[s[0], s[1], '^>v<'.index(s[2])] + s[3:] for s in v['slots']]} if 'slots' in v else {})}
                            for v in d['variants']]
    return spec


# JS에서 부르는 입구 (문자열로 주고받는다). 레슨 JSON 한 개와 코드를 받는다.
def run_json(lesson_json, code):
    return json.dumps(run(parse_lesson(json.loads(lesson_json)), code), ensure_ascii=False)


def count_json(code):
    try:
        return count_stmts(ast.parse(code, USER))
    except SyntaxError:
        return -1
