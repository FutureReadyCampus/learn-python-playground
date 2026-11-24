# Python Puzzle

Python 입문 체험용 3D 퍼즐 앱입니다. 기존 2D 프로토타입은 Git 이력에 있습니다.

```sh
python3 -m http.server 8770 --directory app
python3.13 app/py/test_puzzle.py
python3.13 app/py/check_lessons.py
python3.13 tools/motion/check_explain.py
```

브라우저에서 http://localhost:8770/ 을 엽니다. Learn은 검증된 커밋의
`publish-files.txt`에 적힌 앱 파일만 가져갑니다. Swift Playgrounds 캡처와
추출 텍스트는 로컬 내부 참고 자료로 보관합니다.
