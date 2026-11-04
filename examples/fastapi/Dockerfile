ARG PYTHON_IMAGE=python:3.13-slim@sha256:9662417aace5ae7b8e2609cce472b72a8958e134ba372808abe9cc1a0c0125e6
FROM ${PYTHON_IMAGE}

ARG VERSION
ARG VCS_REF
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.source="https://github.com/replace-owner/replace-repository"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    VERSION_FILE=/app/VERSION

WORKDIR /app
COPY VERSION /app/VERSION
COPY examples/fastapi/requirements.lock /app/requirements.lock
RUN test -n "${VERSION}" \
    && test "${VERSION}" = "$(cat /app/VERSION)" \
    && python -m pip install --no-cache-dir --require-hashes -r /app/requirements.lock

COPY examples/fastapi/main.py /app/main.py
USER 65532:65532
EXPOSE 8080
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
