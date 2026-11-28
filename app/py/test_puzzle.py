"""python3 app/py/test_puzzle.py 로 돌리는 실행기 자체 점검."""
from puzzle import run

LINE = {'H': [[1, 1, 1, 1]], 'start': [0, 0, 1], 'gems': [[3, 0]], 'sws': [], 'portals': {},
        'tools': ['move', 'gem', 'for', 'var', 'def', 'if', 'while', 'left', 'right', 'sw'], 'max': 0, 'need': []}


def acts(r):
    return [a['t'] for a in r['runs'][0]['actions']]


def first(r):
    return r['runs'][0]


r = run(LINE, 'for _ in range(3):\n    move_forward()\ncollect_gem()\n')
assert r['ok'] and not first(r)['error'] and acts(r) == ['move'] * 3 + ['gem'], r
assert [a['ln'] for a in first(r)['actions']] == [2, 2, 2, 3]
assert first(r)['actions'][0]['from'] == [0, 0] and first(r)['actions'][0]['to'] == [1, 0]

r = run(LINE, 'move_forward()\nmove_forward()\nmove_forward()\nmove_forward()\n')
assert first(r)['error']['msg'] == '앞이 막혀 있어요' and first(r)['error']['line'] == 4, r
assert acts(r)[-1] == 'bump'

r = run(LINE, 'for _ in range(3)\n    move_forward()\n')
assert r['static'] and r['static']['line'] == 1, r

r = run({**LINE, 'tools': ['move', 'gem']}, 'while True:\n    move_forward()\n')
assert acts(r) == ['move'] * 3 + ['bump'] and '반복문' in r['conditions'][0] and not r['ok'], r

r = run(LINE, 'x = 1\nwhile True:\n    x += 1\n')
assert '무한 반복' in first(r)['error']['msg'], r

r = run(LINE, 'def go(n):\n    for _ in range(n):\n        move_forward()\ngo(3)\ncollect_gem()\nprint("done", 1)\n')
assert r['ok'] and first(r)['actions'][-1] == {'t': 'print', 'ln': 6, 's': 'done 1'}, r

r = run({**LINE, 'check': {'var': 'gem_count'}}, 'gem_count = 0\nfor _ in range(3):\n    move_forward()\ncollect_gem()\n')
assert not r['ok'] and 'gem_count' in first(r)['goal_msg'], r

r = run(LINE, 'steps = [1, 2]\nprint(steps[5])\n')
assert first(r)['error']['line'] == 2 and 'IndexError' in first(r)['error']['msg'], r

r = run({**LINE, 'need': ['def_args']}, 'def go():\n    move_forward()\n')
assert '꼭 써야' in r['conditions'][0], r

# 같은 금지 명령이 반복돼도 한 번 안내하고, 모든 맵의 보석을 모아도 조건 위반이면 미완료
r = run({**LINE, 'tools': ['gem'], 'need': ['for'], 'max': 3, 'variants': [{}]},
        'move_forward()\n' * 3 + 'collect_gem()\n')
assert len(r['conditions']) == 3 and not r['ok'] and not r['static'], r
assert len(r['runs']) == 2 and all(m['done'] for m in r['runs']), r
assert acts(r) == ['move'] * 3 + ['gem'], r
r = run(LINE, 'move_forward()\nbreak\n')
assert r['static']['line'] == 2 and not r['runs'], r

# 빈 코드는 통과하면 안 된다
r = run({**LINE, 'gems': [], 'sws': []}, 'pass\n')
assert not r['ok'], r

# 포털: 켜고 끄기
P = {'H': [[1, 1, 1, 1, 1]], 'start': [0, 0, 1], 'gems': [[4, 0]], 'sws': [], 'portals': {'a': [1, 0], 'b': [3, 0]},
     'tools': ['move', 'gem', 'var'], 'max': 0, 'need': []}
r = run(P, 'move_forward()\ncollect_gem()\n') if False else run(P, 'move_forward()\nmove_forward()\ncollect_gem()\n')
mv = first(r)['actions'][0]
assert mv['to'] == [1, 0] and mv['tele'] == [3, 0], mv
assert r['ok'], r                      # 순간이동 3 -> 한 칸 더 가면 4
r = run(P, 'portal_a.is_active = False\nmove_forward()\nmove_forward()\nmove_forward()\nmove_forward()\ncollect_gem()\n')
assert r['ok'] and first(r)['actions'][0] == {'t': 'portal', 'ln': 1, 'k': 'a', 'on': False}, r
assert first(r)['actions'][1]['tele'] is None

# 도우미와 잠금 발판
L = {'H': [[1, 1, 1, 1]], 'start': [0, 0, 1], 'gems': [[3, 0]], 'sws': [], 'portals': {}, 'slots': [[0, 0, 1]],
     'plats': [{'at': [2, 0], 'hi': 2}], 'tools': ['move', 'gem', 'var'], 'max': 0, 'need': []}
L['H'] = [[1, 1, 0, 1]]
r = run(L, 'move_forward()\nmove_forward()\n')
assert first(r)['error'] and not r['ok']
r = run(L, 'helper = Expert()\nhelper.turn_lock_up()\n')
assert not r['ok'] and first(r)['actions'][0]['t'] == 'spawn' and first(r)['actions'][1]['t'] == 'lock'

# world.place
W = {'H': [[1, 0, 0, 1]], 'start': [0, 0, 1], 'gems': [], 'sws': [], 'portals': {},
     'goal': {'collect': 1}, 'tools': ['move', 'gem', 'var', 'for'], 'max': 0, 'need': []}
r = run(W, 'world.place(Block(), at_column=1, row=0)\nworld.place(Block(), at_column=2, row=0)\n'
           'world.place(Gem(), at_column=2, row=0)\nmove_forward()\nmove_forward()\ncollect_gem()\n')
assert r['ok'], r
assert [a['t'] for a in first(r)['actions']][:3] == ['place'] * 3
r = run(W, 'world.place(Block(), at_column=9, row=0)\n')
assert '세상 안' in first(r)['error']['msg'], r

# 변형 맵: 모두 통과해야 ok
V = {**LINE, 'variants': [{'H': [[1, 1, 1, 1, 1]], 'gems': [[4, 0]]}]}   # 기본 맵 + 변형 1개 = 2번 실행
r = run(V, 'for _ in range(3):\n    move_forward()\ncollect_gem()\n')
assert not r['ok'] and len(r['runs']) == 2, r
r = run(V, 'while not is_on_gem():\n    move_forward()\ncollect_gem()\n')
assert r['ok'] and len(r['runs']) == 2, r

# 새 문법 검사
r = run({**LINE, 'need': ['not']}, 'while not is_blocked():\n    move_forward()\ncollect_gem()\n')
assert r['ok'], r
r = run({**LINE, 'need': ['kwargs']}, 'move_forward()\n')
assert '이름을 붙인' in r['conditions'][0], r

print('ok')
