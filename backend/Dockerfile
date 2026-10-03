# FastAPI backend for physics-react.
#
# GitHub Pages cannot run this: Pages serves static files only. Deploy to any
# container host (Fly.io, Render, Railway, Cloud Run). The frontend reads its
# origin from VITE_API_URL at build time, so point that variable at the URL
# this container serves and rebuild the frontend.
FROM python:3.12-slim

WORKDIR /app

# uv resolves and installs far faster than pip, and the lockfile keeps the
# deployed dependency set identical to what the tests ran against.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app

# Run unprivileged. The app needs no write access to the filesystem.
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]