# Bun 공식 이미지 사용
FROM oven/bun:1.0-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일들 복사
COPY package.json bun.lockb* ./

# 의존성 설치
RUN bun install --frozen-lockfile

# TypeScript 설정 파일 복사
COPY tsconfig.json ./

# 소스 코드 복사
COPY src/ ./src/

# TypeScript 빌드
RUN bun run build

# 프로덕션 스테이지
FROM oven/bun:1.0-alpine AS production

WORKDIR /app

# 필요한 파일들만 복사
COPY package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

# 사용자 생성 (보안)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bunuser -u 1001

# 소유권 변경
RUN chown -R bunuser:nodejs /app
USER bunuser

# 포트 노출 (필요시)
EXPOSE 3000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD pgrep -f "bun run" || exit 1

# 애플리케이션 실행
CMD ["bun", "run", "start"]
