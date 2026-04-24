.PHONY: all epub html pdf assemble clean help

help:
	@echo "사용 가능한 타겟:"
	@echo "  make assemble  — chapters/ + publish/ 를 build/manuscript.md 로 병합"
	@echo "  make epub      — EPUB 빌드"
	@echo "  make html      — 단일 HTML 빌드 (리소스 임베드)"
	@echo "  make pdf       — PDF 빌드 (xelatex + CJK 폰트 필요)"
	@echo "  make all       — epub + html + pdf"
	@echo "  make clean     — build/ 전부 삭제"

all: epub html pdf

epub html pdf:
	@./scripts/build.sh $@

assemble:
	@./scripts/assemble.sh

clean:
	rm -rf build/
