FROM ghcr.io/muchobien/pocketbase:latest AS source
FROM alpine:3.19
RUN apk add --no-cache wget
COPY --from=source /usr/local/bin/pocketbase /usr/local/bin/pocketbase
COPY start.sh /start.sh
RUN chmod +x /start.sh
EXPOSE 8090
ENTRYPOINT ["/start.sh"]
