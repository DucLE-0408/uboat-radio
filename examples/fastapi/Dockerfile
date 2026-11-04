ARG PYTHON_IMAGE=python:3.13-slim@sha256:ae14d4ce8771606477a81446e7ef429edd6762305fc50c84507c1041fa8285d1
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
# pip is only needed to install the locked requirements. Its vendored msgpack, urllib3 and setuptools copies carry HIGH CVEs
# (setuptools 70.3.0 is vendored even in the newest pip), so the runtime image does not ship pip at all.
RUN test -n "${VERSION}" \
    && test "${VERSION}" = "$(cat /app/VERSION)" \
    && python -m pip install --no-cache-dir --require-hashes -r /app/requirements.lock \
    && python -m pip uninstall --yes pip

COPY examples/fastapi/main.py /app/main.py
USER 65532:65532
EXPOSE 8080
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
