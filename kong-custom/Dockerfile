FROM kong:3.6.1

USER root

RUN apt-get update && \
    apt-get install -y git protobuf-compiler libprotobuf-dev luarocks unzip curl && \
    rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/starwing/lua-protobuf.git /tmp/lua-protobuf && \
    cd /tmp/lua-protobuf && \
    luarocks make && \
    cd / && rm -rf /tmp/lua-protobuf

COPY kong /usr/local/share/lua/5.1/kong

ENV KONG_PLUGINS=bundled,grpc-transcode

USER kong
