"""레슨 정답 점검: python3 app/py/check_lessons.py [레슨ID ...]

- lessons/*.json 의 모든 레슨을 브라우저 없이 puzzle.py 로 돌려 본다.
- 정답(solution)은 통과해야 하고, 시작 코드(starter)·빈 코드·오답(wrong)은 통과하면 안 된다.
- docs/curriculum.md 의 모든 ID가 빠짐없이 있고 구분(핵심/도전/보너스)이 맞는지 본다.
"""
import json
import pathlib
import re
import sys

from puzzle import parse_lesson, run

ROOT = pathlib.Path(__file__).resolve().parents[2]
LESSONS = ROOT / 'app' / 'lessons'
FILES = ['tour', 'basics', 'practice']
KIND_KO = {'핵심': 'core', '도전': 'challenge', '보너스': 'bonus'}
BLOCKS = json.loads((LESSONS / 'blocks.json').read_text(encoding='utf8'))
CODE_FIELDS = ('solution', 'starter')


def text(v):
    return '\n'.join(v) + '\n' if isinstance(v, list) else v


def load():
    out = []
    for name in FILES:
        for d in json.loads((LESSONS / f'{name}.json').read_text(encoding='utf8')):
            d['course'] = name
            out.append(d)
    # 작업 중인 레슨: lessons/new/<이름>.json — 새 레슨이거나, 같은 id의 기존 레슨을 바꾸는 것 (다 만들면 merge_new_lessons.py 로 합쳐요)
    news = {}
    for f in sorted((LESSONS / 'new').glob('*.json')):
        for d in json.loads(f.read_text(encoding='utf8')):
            d['course'] = {'T': 'tour', 'B': 'basics', 'P': 'practice'}[d['id'][0]]
            news[d['id']] = d
    out = [news.pop(d['id'], d) for d in out] + list(news.values())
    return out


def curriculum():
    """docs/curriculum.md 의 표에서 {ID: kind} 를 읽는다."""
    ids = {}
    for line in (ROOT / 'docs' / 'curriculum.md').read_text(encoding='utf8').splitlines():
        m = re.match(r'\|\s*([TBP]\d+-\d+)\s*\|(.*)\|\s*$', line)
        if not m:
            continue
        cells = [c.strip() for c in m.group(2).split('|')]
        kind = next((KIND_KO[c] for c in cells if c in KIND_KO), 'core')
        ids[m.group(1)] = kind
    return ids


def spec_of(d):
    spec = parse_lesson(d)
    if d['course'] == 'tour':                      # 블록 레슨: 블록 종류 → 문법 열쇠
        spec['tools'] = sorted({BLOCKS[k]['gate'] for k in d['tools'] if BLOCKS[k]['gate']})
    return spec


def check_map(d, errs):
    maps = [d] + list(d.get('variants') or [])
    for i, m in enumerate(maps):
        tag = '' if i == 0 else f'(변형 {i})'
        H, O = m['H'], m['O']
        if len({len(r) for r in H}) != 1 or len(H) != len(O) or any(len(a) != len(b) for a, b in zip(H, O)):
            errs.append(f'맵 {tag} H와 O의 크기가 달라요')
            continue
        starts = sum(r.count(c) for r in O for c in '^>v<')
        if starts != 1:
            errs.append(f'맵 {tag} 시작 위치가 {starts}개예요')
        for z, row in enumerate(O):
            for x, c in enumerate(row):
                if c not in '.^>v<goabcdef':
                    errs.append(f'맵 {tag} 알 수 없는 글자 {c!r}')
                elif c != '.' and H[z][x] == '.':
                    errs.append(f'맵 {tag} ({x},{z}) 빈 칸 위에 물건이 있어요')
        ps = sorted({c for r in O for c in r if c in 'abcdef'})
        for a in ps[::2]:
            if chr(ord(a) + 1) not in ps:
                errs.append(f'맵 {tag} 포털 {a}의 짝이 없어요')



def sentences(t):
    return len(re.findall(r'[.?!](?:\s|$)', t.strip()))


def check_text(d, errs):
    """docs/PLAN.md 4.4: 레슨 글 분량."""
    if len(d['goal']) > 30:
        errs.append(f'goal이 {len(d["goal"])}자예요 (30자 이내): {d["goal"]}')
    if not 1 <= sentences(d['hint']) <= 2:
        errs.append(f'hint는 1~2문장이어야 해요 (지금 {sentences(d["hint"])}문장)')
    want = 1 if d['course'] == 'tour' else 2
    if sentences(d['concept']) != want:
        errs.append(f'concept은 {want}문장이어야 해요 (지금 {sentences(d["concept"])}문장)')
    if ' · ' not in d.get('term', ''):
        errs.append("term이 '이름(영어) · 쉬운 풀이' 꼴이 아니에요")
    if not 1 <= sentences(d.get('desc', '')) <= 3:
        errs.append('desc는 1~3문장이어야 해요 (퍼즐 화면 위 설명)')
    st = d.get('steps') or []
    if not 2 <= len(st) <= 4 or any(not x or len(x) > 50 for x in st):
        errs.append('steps는 50자 이내 항목 2~4개여야 해요 (번호 붙은 할 일)')
    if not d.get('tag'):
        errs.append('tag(제목 앞의 개념 이름)가 없어요')
    if d['unit'] != d['id'].split('-')[0]:
        errs.append('unit이 ID와 달라요')


def check_lesson(d, ids):
    errs = []
    for k in ('id', 'unit', 'name', 'kind', 'goal', 'hint', 'concept', 'tools', 'H', 'O', 'solution'):
        if k not in d:
            errs.append(f'{k} 필드가 없어요')
    if errs:
        return errs
    if d['id'] in ids and ids[d['id']] != d['kind']:
        errs.append(f'구분이 목차와 달라요 (목차 {ids[d["id"]]}, 레슨 {d["kind"]})')
    check_map(d, errs)
    check_text(d, errs)
    if errs:
        return errs
    if d['course'] == 'tour':
        bad = [k for k in d['tools'] if k not in BLOCKS]
        if bad:
            return [f'모르는 블록 {bad}']
    spec = spec_of(d)
    r = run(spec, text(d['solution']))
    if r['static']:
        errs.append(f'정답이 검사에서 걸려요: {r["static"]["msg"]} (줄 {r["static"]["line"]})')
    elif not r['ok']:
        last = r['runs'][-1]
        why = last['error']['msg'] if last['error'] else last['goal_msg'] or '목표를 다 못 채워요'
        errs.append(f'정답이 통과하지 못해요 (맵 {len(r["runs"])}/{len(spec.get("variants") or [0])}): {why}')
    wrongs = [''] + [text(w) for w in d.get('wrong', [])]
    if d.get('starter'):
        wrongs.append(text(d['starter']))
    if 'move_forward()' not in ''.join(wrongs):
        wrongs.append('move_forward()\n')
    for w in wrongs:
        rr = run(spec, w)
        if rr['ok']:
            errs.append(f'통과하면 안 되는 코드가 통과해요:\n    ' + w.strip().replace('\n', '\n    ')[:200])
    return errs


def main(argv):
    lessons = load()
    ids = curriculum()
    want = set(argv)
    bad = total = 0
    seen = set()
    for d in lessons:
        if d['id'] in seen:
            print(f'FAIL {d["id"]}: ID가 겹쳐요')
            bad += 1
        seen.add(d['id'])
        if want and d['id'] not in want:
            continue
        total += 1
        errs = check_lesson(d, ids)
        if errs:
            bad += 1
            print(f'FAIL {d["id"]} {d.get("name", "")}')
            for e in errs:
                print('   -', e)
    if not want:
        missing = [i for i in ids if i not in seen]
        if missing:
            bad += 1
            print('FAIL 목차에는 있는데 레슨이 없어요:', ', '.join(missing))
        extra = [i for i in seen if i not in ids]
        if extra:                                  # 새로 더한 레슨은 tools/sync_curriculum.py 가 목차에 채워 줘요
            print('안내: 목차(curriculum.md)에 아직 없는 레슨', len(extra), '개:', ', '.join(extra[:12]), '…' if len(extra) > 12 else '')
    n_core = sum(1 for d in lessons if d.get('kind') == 'core')
    print(f'{total}개 점검, 실패 {bad}개 (핵심 {n_core}개 / 전체 레슨 {sum(1 for d in lessons if d.get("kind") != "page")}개)')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
