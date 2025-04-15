FROM node:20-alpine3.17 AS build

# OS Packages
RUN apk add --update --no-cache dumb-init

WORKDIR /app
COPY package.json ./

# COPY source.config.ts ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine3.17 AS app

LABEL MAINTAINER Nishith Kulshrestha <nishith.kulshrestha@coindcx.com>

COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init


# Non-Root user
RUN addgroup -g 7777 dcx &&\
    adduser -D -h /home/dcx dcx -s /bin/false -u 7777 -G dcx

USER dcx
RUN mkdir /home/dcx/app
WORKDIR /home/dcx/app

# setup project structure
#COPY --chown=dcx:dcx --from=build /app/.next ./.next
COPY --from=build /app/dist /home/dcx/app/dist
COPY --chown=dcx:dcx . .
COPY --chown=dcx:dcx --from=build /app/package-lock.json ./package-lock.json

#RUN chmod +x /home/dcx/app/deployment/entrypoint.sh

# only install production dependencies
RUN npm ci --only=production

ENTRYPOINT [ "/usr/bin/dumb-init", "--" ]
CMD ["npm", "run", "start"]
