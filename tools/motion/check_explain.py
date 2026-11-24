"""유닛 소개 검사: python3 tools/motion/check_explain.py [유닛 ...]   (규칙: docs/EXPLAIN-GUIDE.md)
브라우저 없이 돈다. 통과하지 못하면 올리지 않는다.
- 형식: unit, title, term('이름(영어) · 풀이'), takeaway, slides, (mids)
- 세 단계 전략: 맨 앞 소개에 ① 일상 그림(code 없음) ② 일상+코드 그림(code, world 없음) ③ 퍼즐+코드 그림(code + world) 이 이 순서로 있어야 함
- 장 수: Tour 5~14장, Basics/Practice 7~18장. 퀴즈는 소개마다(맨 앞 소개와 중간 소개 모두) 3개 이상. 마지막 장은 퀴즈가 아님
- 정리 페이지(outro): 유닛마다 하나. 7~12장, 퀴즈 4개 이상, '면접 질문: …' 카드(text) + 모범 답변(bubble, 예시·언제 쓰는지는 note) 2장 이상, '이 유닛에서 배운 것' 정리 장
- 중간 소개(mids): before = 그 유닛의 레슨 id(첫 레슨 제외), title, 4~7장, 코드 그림 1개 이상, 퀴즈 1개 이상
- 디버거 그림: 단계의 line 순서가 실제 파이썬 실행 순서(줄 이벤트)와 똑같아야 함. vars 값도 그 줄을 실행한 뒤의 실제 값과 같아야 함
  (일상 코드의 모르는 이름은 아무 일도 안 하는 함수로, 퍼즐 코드는 world 맵에서 진짜 실행기로 돌림)
- 글 길이: text 70자, bubble·note 60자, 그림 자막 32자 / SVG: viewBox 960x540, 색 직접 쓰기 금지, <use> 금지, 단계 id 존재
- 퀴즈: 선택지 2~4개, 정답 번호, why. verify가 있으면 실제로 실행해 정답 선택지의 숫자와 결과를 비교"""
import ast
import builtins
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'app' / 'py'))
from puzzle import World, build_api, parse_lesson, run  # noqa: E402

EX = ROOT / 'app' / 'explain'
LESSONS = {d['id']: d for f in ('tour', 'basics', 'practice')
           for d in json.loads((ROOT / 'app' / 'lessons' / f'{f}.json').read_text(encoding='utf8'))}
TOOLS = ['move', 'left', 'right', 'gem', 'sw', 'for', 'while', 'if', 'def', 'var', 'class', 'break', 'continue',
         'fstring', 'listcomp', 'dict', 'try', 'with']
COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b(?![-_])|rgba?\(|hsla?\(')
FILE = '<ex>'


def lines(v):
    return v if isinstance(v, list) else [v]


def parses(code):
    src = '\n'.join(lines(code))
    for extra in ('', '\n' + ' ' * 8 + 'pass', '\n    pass'):
        try:
            ast.parse(src + extra)
            return True
        except SyntaxError:
            continue
    return False


class Thing:
    """일상 코드의 모르는 이름: 불러도 되고(물_주기()), 속성을 넣고 읽어도 되고(문1.열림 = True), 메서드를 불러도 돼요."""
    def __call__(self, *a, **kw):
        return Thing()

    def __getattr__(self, k):
        if k.startswith('__'):
            raise AttributeError(k)
        v = Thing()
        object.__setattr__(self, k, v)
        return v


class Auto(dict):
    """일상 코드용 이름표 상자: 모르는 이름은 Thing이 되고, 한 번 만들면 계속 같은 것을 가리켜요."""
    def __missing__(self, k):
        if hasattr(builtins, k):
            return getattr(builtins, k)
        self[k] = Thing()
        return self[k]


def show(v):
    return repr(v) if isinstance(v, str) else str(v)


def trace(code, world=None, dotted=()):
    """코드를 실제로 실행하며 줄 이벤트 순서와, 각 줄을 실행한 뒤의 변수 값을 모은다."""
    src = '\n'.join(lines(code)) + '\n'
    g = Auto({'__name__': '__main__', '__builtins__': builtins})
    if world:
        g.update(build_api(World(parse_lesson({'H': world['H'], 'O': world['O'], 'tools': TOOLS,
                                               'slots': world.get('slots', []), 'plats': world.get('plats', []),
                                               'files': world.get('files', {})}))))
    events, snaps = [], []

    def plain(d):
        out = {k: show(v) for k, v in d.items() if isinstance(v, (int, float, str, bool, list, tuple, dict)) or v is None}
        for name in dotted:                     # 'portal_a.is_active' 처럼 점이 있는 이름은 속성을 읽어요
            obj, *attrs = name.split('.')
            v = d.get(obj, None)
            try:
                for a in attrs:
                    v = getattr(v, a)
                if obj in d:
                    out[name] = show(v)
            except AttributeError:
                pass
        return out

    def scope(frame):
        d = {k: v for k, v in g.items() if not k.startswith('__')}
        d.update(frame.f_locals)
        return plain(d)

    def tr(frame, ev, arg):
        if frame.f_code.co_filename != FILE:
            return None
        if ev == 'line':
            events.append(frame.f_lineno)
            snaps.append(scope(frame))
            if len(events) > 400:
                raise RuntimeError('줄이 너무 많아요')
        return tr

    err = None
    sys.settrace(tr)
    try:
        exec(compile(src, FILE, 'exec'), g)
    except Exception as e:                      # noqa: BLE001
        err = f'{type(e).__name__}: {e}'
    finally:
        sys.settrace(None)
    final = plain({k: v for k, v in g.items() if not k.startswith('__')})
    after = snaps[1:] + [final]                 # i번째 줄을 실행한 뒤의 값 = 다음 줄 이벤트 때의 값
    return events, after, err


def check_scene(tag, sc, errs):
    f = EX / sc.get('svg', '')
    if not f.is_file():
        errs.append(f'{tag}: SVG가 없어요 {sc.get("svg")}')
        return
    svg = f.read_text(encoding='utf8')
    if 'viewBox="0 0 960 540"' not in svg:
        errs.append(f'{tag}: viewBox가 0 0 960 540이 아니에요')
    if COLOR.search(svg):
        errs.append(f'{tag}: SVG에 색을 직접 적었어요 (CSS 변수만 써요)')
    if '<use' in svg:
        errs.append(f'{tag}: <use>는 쓰지 않아요')
    if not sc.get('alt'):
        errs.append(f'{tag}: alt가 없어요')
    steps = sc.get('steps', [])
    code = sc.get('code')
    lo, hi = (3, 30) if code else (3, 6)
    if not lo <= len(steps) <= hi:
        errs.append(f'{tag}: 단계가 {len(steps)}개예요 ({lo}~{hi})')
    a, b = sc.get('part', [0, len(steps)])
    if not (0 <= a < b <= len(steps)) or b - a > 10:
        errs.append(f'{tag}: 한 그림에 보여 주는 단계는 10개까지예요 (지금 {b - a}개, part {[a, b]}). split_scenes.py로 나눠요')
    ids = set(re.findall(r'\bid="([^"]+)"', svg))
    for j, s in enumerate(steps):
        cap = s.get('cap', '')
        if not cap or len(cap) > 32:
            errs.append(f'{tag} {j + 1}단계: 자막이 비었거나 32자를 넘어요 ({len(cap)}자)')
        used = set(s.get('show', [])) | set(s.get('hide', [])) | set(s.get('on', [])) | set(s.get('move', {})) | set(s.get('text', {}))
        for i in sorted(used - ids):
            errs.append(f'{tag} {j + 1}단계: SVG에 없는 id {i}')
    if not code:
        if any('line' in s or 'vars' in s for s in steps):
            errs.append(f'{tag}: code가 없는 그림에는 line/vars를 쓰지 않아요')
        return
    if not parses(code):
        errs.append(f'{tag}: 코드가 파이썬 문법이 아니에요')
        return
    if re.search(r'^\s*#', '\n'.join(lines(code)), re.M):
        errs.append(f'{tag}: 디버거 코드에는 주석 줄을 넣지 않아요 (줄 번호가 실행 순서와 어긋나요)')
    dotted = sorted({n for s in steps for n in (s.get('vars') or {}) if '.' in n})
    events, after, err = trace(code, sc.get('world'), dotted)
    if err:
        errs.append(f'{tag}: 코드를 실행하면 오류가 나요 ({err})')
        return
    want = [s['line'] for s in steps if s.get('line')]
    if want != events:
        errs.append(f'{tag}: ▶ 줄 순서가 실제 실행 순서와 달라요\n       그림: {want}\n       실제: {events}')
        return
    k = 0
    for j, s in enumerate(steps):
        if not s.get('line'):
            if s.get('vars'):
                errs.append(f'{tag} {j + 1}단계: line이 없는 단계에는 vars를 쓰지 않아요')
            continue
        for name, val in (s.get('vars') or {}).items():
            got = after[k].get(name)
            if val is None:                     # null = 이 줄 뒤에 그 이름표가 사라져요 (함수가 끝나 매개변수가 없어짐 등)
                if name in after[k]:
                    errs.append(f'{tag} {j + 1}단계: {name}은 아직 있어요 ({got}) — 사라지는 표시(null)가 틀렸어요')
                continue
            if got != show(val) and got != str(val):
                errs.append(f'{tag} {j + 1}단계: 변수 {name}은 {got}인데 그림에는 {val!r}')
        k += 1


def check_quiz(tag, q, errs):
    for k in ('q', 'choices', 'why'):
        if not q.get(k):
            errs.append(f'{tag}: 퀴즈에 {k}가 없어요')
    ch, ans = q.get('choices', []), q.get('answer')
    if not 2 <= len(ch) <= 4 or not isinstance(ans, int) or not 0 <= ans < len(ch):
        errs.append(f'{tag}: 선택지(2~4개)나 정답 번호가 이상해요')
        return
    if q.get('code') and not parses(q['code']):
        errs.append(f'{tag}: 퀴즈 코드가 파이썬 문법이 아니에요')
    v = q.get('verify')
    if v:
        raw = {'H': v['H'], 'O': v['O'], 'tools': TOOLS, 'max': 0, 'need': [], 'slots': v.get('slots', []), 'plats': v.get('plats', [])}
        ms = v.get('measure', 'collected')
        if ms.startswith('var:'):
            raw['watch'] = [ms[4:]]
        res = run(parse_lesson(raw), '\n'.join(lines(v.get('code', q.get('code')))) + '\n')
        r = res['runs'][0] if res['runs'] else None
        if res['static'] or not r or r['error']:
            errs.append(f'{tag}: verify 코드가 실행되지 않아요 {res["static"] or (r and r["error"])}')
            return
        if ms == 'collected':
            got = sum(1 for a in r['actions'] if a['t'] == 'gem' and a.get('ok'))
        else:
            st = [a for a in r['actions'] if a['t'] == 'state']
            got = st[-1]['vars'].get(ms[4:]) if st else None
        m = re.search(r'-?\d+', ch[ans])
        if not m or int(m.group()) != got:
            errs.append(f'{tag}: 정답 {ch[ans]!r}가 실제 결과({got})와 달라요')


def check_slides(prefix, sl, lo, hi, need_q, errs):
    if not lo <= len(sl) <= hi:
        errs.append(f'{prefix}장이 {len(sl)}개예요 ({lo}~{hi})')
    if sum(1 for s in sl if s.get('quiz')) < need_q:
        errs.append(f'{prefix}퀴즈가 {need_q}개 이상이어야 해요')
    if sl and sl[-1].get('quiz'):
        errs.append(f'{prefix}마지막 장은 퀴즈가 아니라 "코딩 시작" 앞의 마무리 글이에요')
    for i, s in enumerate(sl):
        tag = f'{prefix}{i + 1}장'
        if not any(s.get(k) for k in ('text', 'scene', 'code', 'quiz', 'bubble')):
            errs.append(f'{tag}: 비어 있어요')
        for k, n in (('text', 70), ('bubble', 60), ('note', 60)):
            if s.get(k) and len(s[k]) > n:
                errs.append(f'{tag}: {k}가 {len(s[k])}자예요 ({n}자 이내)')
        if s.get('code') and not parses(s['code']):
            errs.append(f'{tag}: 코드가 파이썬 문법이 아니에요')
        if s.get('scene'):
            check_scene(tag, s['scene'], errs)
        if s.get('quiz'):
            check_quiz(tag, s['quiz'], errs)


def kinds(sl):
    """그림의 종류 순서: life(일상만) / life-code(일상+코드) / puzzle-code(퍼즐+코드)"""
    out = []
    for s in sl:
        sc = s.get('scene')
        if sc:
            out.append('puzzle-code' if sc.get('code') and sc.get('world') else 'life-code' if sc.get('code') else 'life')
    return out


def check_unit(unit):
    errs = []
    d = json.loads((EX / f'{unit}.json').read_text(encoding='utf8'))
    for k in ('unit', 'title', 'term', 'takeaway', 'slides'):
        if not d.get(k):
            errs.append(f'{k} 필드가 없어요')
    if d.get('unit') != unit:
        errs.append('unit이 파일 이름과 달라요')
    if ' · ' not in d.get('term', ''):
        errs.append("term이 '이름(영어) · 쉬운 풀이' 꼴이 아니에요")
    tour = unit.startswith('T')
    sl = d.get('slides', [])
    check_slides('', sl, *((5, 14, 3) if tour else (7, 18, 3)), errs)   # 소개마다 퀴즈 3개 이상
    ks = kinds(sl)
    order = [k for k in ('life', 'life-code', 'puzzle-code') if k in ks]
    if order != ['life', 'life-code', 'puzzle-code']:
        errs.append(f'세 단계 그림(일상 → 일상+코드 → 퍼즐+코드)이 모두 있어야 해요 (지금: {ks})')
    elif ks.index('life') > ks.index('life-code') or ks.index('life-code') > ks.index('puzzle-code'):
        errs.append(f'그림 순서는 일상 → 일상+코드 → 퍼즐+코드예요 (지금: {ks})')
    ids = [i for i, x in LESSONS.items() if x['unit'] == unit]
    for m in d.get('mids', []):
        p = f'중간 소개 {m.get("before")} '
        if m.get('before') not in ids[1:]:
            errs.append(f'{p}: before는 이 유닛의 레슨 id여야 해요 (첫 레슨 제외)')
        if not m.get('title'):
            errs.append(f'{p}: title이 없어요')
        check_slides(p, m.get('slides', []), 4, 11, 3, errs)
        if not any(k != 'life' for k in kinds(m.get('slides', []))):
            errs.append(f'{p}: 코드가 함께 나오는 그림이 1개 이상 있어야 해요')
    # 정리 페이지(outro): 유닛의 마지막 퍼즐 뒤. 복습 + 면접식 질문 (모범 답변 카드 + 퀴즈)
    o = d.get('outro')
    if not o:
        errs.append('정리 페이지(outro)가 없어요 — 유닛마다 하나씩 있어야 해요')
    else:
        osl = o.get('slides', [])
        check_slides('정리 ', osl, 7, 12, 4, errs)
        cards = [x for x in osl if x.get('bubble') and (x.get('text') or '').startswith('면접')]
        if len(cards) < 2:
            errs.append("정리 페이지에는 '면접 질문: …'(text) + 모범 답변(bubble) 카드가 2장 이상 있어야 해요")
        if not any((x.get('text') or '').startswith('이 유닛') or '정리' in (x.get('text') or '') for x in osl):
            errs.append("정리 페이지에는 '이 유닛에서 배운 것' 정리 장이 있어야 해요")
    return errs


def main(argv):
    idx = json.loads((EX / 'index.json').read_text(encoding='utf8'))
    units = argv or idx['units']
    bad = 0
    for u in units:
        errs = check_unit(u)
        print(('FAIL ' if errs else 'ok   ') + u)
        for e in errs:
            print('   -', e)
        bad += bool(errs)
    print(f'{len(units)}개 유닛 점검, 실패 {bad}개')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
