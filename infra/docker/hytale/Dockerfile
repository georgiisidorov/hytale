FROM ubuntu:24.04

# OpenJDK 25 из архива проекта
COPY OpenJDK25.tar.gz /tmp/
RUN tar -xzf /tmp/OpenJDK25.tar.gz -C /opt && \
    JDKDIR=$(tar -tzf /tmp/OpenJDK25.tar.gz | head -1 | cut -d/ -f1) && \
    ln -s /opt/"$JDKDIR" /opt/jdk && \
    rm /tmp/OpenJDK25.tar.gz
ENV JAVA_HOME=/opt/jdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# jq — патч Defaults.GameMode при HYTALE_DEFAULT_GAMEMODE (prod)
RUN apt-get update && apt-get install -y --no-install-recommends jq && rm -rf /var/lib/apt/lists/*
COPY infra/docker/hytale/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY infra/docker/hytale/run-hytale-server.sh /usr/local/bin/run-hytale-server.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/run-hytale-server.sh

# Рабочая директория (каталог server монтируется с хоста через volume)
WORKDIR /home/hytale/server

# Не переключаемся на отдельного пользователя: с bind-mount с хоста файлы часто root:root,
# и java от uid 1001 не может открыть HytaleServer.jar → "Unable to access jarfile".
# Открытие порта Hytale сервера
EXPOSE 5520/udp

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
# AOT: run-hytale-server.sh, HYTALE_USE_AOT=false по умолчанию
CMD ["/usr/local/bin/run-hytale-server.sh"]

