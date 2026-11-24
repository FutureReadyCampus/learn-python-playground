"""브라우저에서 앱을 열어 점검한다: python3 tools/browser_check.py [포트=8770]
- 콘솔 오류가 없는지
- Pyodide 실행기가 뜬 뒤, 모든 레슨의 정답을 앱 안의 실행기로 돌려 통과하는지 (__bp.checkAll)
- 몇몇 레슨을 실제로 불러 3D 재생(여러 캐릭터, 높이 변화, 포털, 놓기)이 오류 없이 끝나는지
앞서 `python3 -m http.server 8770 --directory app` 으로 서버를 켜 두어야 한다."""
import sys
from playwright.sync_api import sync_playwright

port = sys.argv[1] if len(sys.argv) > 1 else '8770'
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1440, 'height': 860})
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('response', lambda r: errors.append(f'{r.status} {r.url}') if r.status >= 400 and 'favicon' not in r.url else None)
    pg.goto(f'http://localhost:{port}/?v=check', wait_until='domcontentloaded', timeout=60000)
    pg.wait_for_function('!!(window.__bp && window.__bp.py())', timeout=90000)
    bad = pg.evaluate('__bp.checkAll()')
    print('앱 안 실행기로 정답 점검: 실패', bad if bad else '없음')
    print('콘솔 오류:', errors if errors else '없음')
    # 실제 화면에서 '정답 보기'를 눌러 끝까지 재생되는지 (여러 캐릭터, 높이 변화, 포털, 놓기, 여러 맵)
    play = sys.argv[2].split(',') if len(sys.argv) > 2 else \
        ['T1-4', 'T3-2', 'T5-2', 'T6-1', 'T7-1', 'T7-2', 'T9-2', 'B2-3', 'B5-3', 'B6-5', 'B7-4',
         'P2-2', 'P3-3', 'P4-6', 'P5-2', 'P5-3', 'P6-7', 'B8-2', 'B9-4', 'B10-1', 'B10-3', 'P7-4', 'P8-4', 'P9-3', 'P10-2',
         'T1-5', 'T1-6', 'T2-4', 'T3-3', 'T4-3', 'T5-3', 'T6-2', 'T7-3', 'T8-3', 'T9-3', 'B1-8', 'B2-7', 'B4-8', 'B5-6', 'B6-9', 'B7-7', 'B9-6', 'B10-6', 'P3-4', 'P5-7', 'P6-11', 'P9-6']
    pg.evaluate('spd=12')
    failed = []
    for lid in play:
        pg.evaluate("id=>{const i=LEVELS.findIndex(l=>l.id==id);ADMIN=true;leaveExplain();load(i)}", lid)
        pg.click('#morebtn')
        pg.click('#sol')
        try:
            pg.wait_for_function("!document.querySelector('#win').hidden", timeout=90000)
            print('재생 완료', lid, '|', pg.inner_text('#w-term')[:40])
        except Exception:
            failed.append(lid)
            print('재생 실패', lid, '| 토스트:', pg.inner_text('#toast'), '| 출력:', pg.inner_text('#out')[:80])
        pg.evaluate("document.querySelector('#win').hidden=true")
    b.close()
    bad = bad + failed
sys.exit(1 if bad or errors else 0)
