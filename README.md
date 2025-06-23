# tus resumable upload protocol

The protocol is in the [protocol.md](protocol.md) file.

It is rendered as HTML via Jekyll/Kramdown by the tus.io repository (type `make preview` there).



## 🧪 Try the Mock API

[![Mock These APIs Instantly](https://cdn.beeceptor.com/assets/images/buttons/mock-openapi-with-beeceptor.png)](https://beeceptor.com/openapi-mock-server/?url=https://raw.githubusercontent.com/anshxpress/tus-resumable-upload-protocol/refs/heads/main/OpenAPI/openapi3.yaml)

## License

Licensed under the MIT license, see
[LICENSE.txt](https://github.com/tus/tus-resumable-upload-protocol/blob/main/LICENSE.txt).

Copyright (c) 2013-2016 Transloadit Ltd and Contributors.

## OpenAPI specification

The OpenAPI Specification ([OAS](https://swagger.io/specification/)) defines a standard, language-agnostic 
interface to RESTful APIs which allows both humans and computers to discover and understand the capabilities 
of the service without access to source code, documentation, or through network traffic inspection. 

There exists tools to create http servers and clients to access APIs using the OpenAPI description as input, e.g.:
- [go-swagger](https://github.com/go-swagger/go-swagger)
- Various generators in [https://swagger.io](https://swagger.io).

The directory OpenAPI contains the OpenAPI (version 3.0.1) definitions of the tus protocol. 
Use a converter, e.g. [API Spec Converter](https://lucybot-inc.github.io/api-spec-converter/), [source](https://github.com/LucyBot-Inc/api-spec-converter)
if you need a different version.

Since implementators are free to use different endpoints, the endpoints documented in the OpenAPI directory are to be considered examples.
