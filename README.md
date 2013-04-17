# tus resumable upload protocol

**Version:** 0.1 ([SemVer](http://semver))<br>
**Date:** 2013-04-15<br>
**Authors:** [Felix Geisendörfer](https://twitter.com/felixge), [Kevin van
Zonneveld](https://twitter.com/kvz), [Tim Koschützki](https://twitter.com/tim_kos)

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](http://www.ietf.org/rfc/rfc2119.txt).

## Status

This protocol is under development and is not ready for general adoption yet.

The goal is to have a 1.0 release candidate in a few weeks, at which point only
minor revisions will be made to the protocol. After a few months 1.0 will be
frozen, and changes will be considered very carefully. Ideally there will be no
need for a version 2.0.

## Contributing

This protocol is authored and owned by the tus community. We welcome patches
and feedback via
[Github](https://github.com/tus/tus-resumable-upload-protocol). All contributors
will be listed as authors.

Please also let us know about any implementations (open source or commercial)
if you'd like to be listed on the
[implementations](http://www.tus.io/implementations.html) page.

## Abstract

The protocol describes the use of [RFC
2616](http://tools.ietf.org/html/rfc2616) (HTTP 1.1) in order to achieve a
[RESTful](http://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
mechanism for resumable file uploads.

## Notation

Characters enclosed by square brackets indicate a placeholder (e.g. `[size]`).

## Example: Resumable Upload

The example below is meant to give you a quick overview over the protocol, but
is not part of the protocol definition.

A new file resource is created by sending a POST request to an URL defined by
the server:

**Request:**

```
POST /files HTTP/1.1
Host: tus.example.org
Content-Length: 0
Content-Range: bytes */100
Content-Type: image/jpeg
Content-Disposition: attachment; filename="cat.jpg"
```
```
[empty body]
```

**Response:**

```
HTTP/1.1 201 Created
Location: http://tus.example.org/files/24e533e02ec3bc40c387f1a0e460e216
Content-Length: 0
```
```
[empty body]
```

After being assigned a resource `Location`, the client starts the actual
upload:

**Request:**

```
PUT /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Length: 100
Content-Range: bytes 0-99/100
```
```
[bytes 0-99]
```

**Response:**

```
HTTP/1.1 200 Ok
Range: bytes=0-99
Content-Length: 0
```
```
[empty body]
```

In this case, the upload succeeded. However, if there had been a network error
during the `PUT` request, the client could have also resumed this upload:

**Request:**

```
HEAD /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
```
```
[empty body]
```

**Response:**

```
HTTP/1.1 200 Ok
Content-Length: 100
Content-Type: image/jpg
Content-Disposition: attachment; filename="cat.jpg"'
Range: bytes=0-69
```
```
[empty body]
```

The `Range` tells the client how much data made it to the server, so he
can continue from there:

```
PUT /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Length: 30
Content-Range: bytes 70-99/100
```
```
[bytes 70-99]
```

**Response:**

```
HTTP/1.1 200 Ok
Range: bytes=0-99
Content-Length: 0
```
```
[empty body]
```

## Protocol

Unless declared otherwise, all rules defined in [RFC
2616](http://tools.ietf.org/html/rfc2616) apply when implementing this
protocol.

### Response Codes

Servers MUST implement the following http status codes:

* `200 Ok` per default
* `201 Created` after creating new resources
* `400 Bad Request` for invalid request
* `404 Not Found` for unknown resources
* `413 Request Entity Too Large` to enforce file size limits
* `500 Internal Server Error` for transient problems

Servers MAY use additional status codes as defined in RFC 2616, and clients
SHOULD interpret them accordingly, or fall back to interpret unknown codes as
irrecoverable errors.

### Error Handling

Both clients and servers SHOULD attempt to detect and handle network errors
predictably. They may do so by checking for read/write socket errors, as well
as setting read/write timeouts. Both clients and servers SHOULD use a 30 second
timeout. A timeout SHOULD be handled by closing the underlaying socket.

Servers SHOULD always attempt to process partial message bodies in order to
store as much of the received data as possible.

Clients SHOULD use a randomized exponential back off strategy after
encountering a network error or receiving a `500 Internal Server Error`. It is
up to the client to decide to give up at some point.

### Request Headers

`Content-Length`: Defines the amount of bytes included in the request body. For
[historical reasons](http://www.motobit.com/help/scptutl/pa98.htm), some
clients and servers may be unable to process `Content-Length` values larger
than 2147483648 (2 GB). Clients therefore SHOULD expose a maximum chunk size
option which defaults to 2147483647 (2 GB - 1) for breaking up large files into
multiple PUT requests.

`Content-Range`: When `Content-Length` is `0`, the `Content-Range` MUST be
given as `bytes */[size]` where `[size]` is the total size of the file. For
`Content-Length` values larger than `0`, the `Content-Range` MUST take the form
`bytes [from]-[to]/[size]`, where `[from]` and `[to]` define the byte range
transmitted in the body according to RFC 2616.

### Response Headers

`Range`: Defines the range of bytes a server has received for the given file
resource. Takes the form `bytes=[from]-[to]`. An empty file is indicated by the
absence of a `Range` header. A completed file is indicated by a `Range` header
where `[from]` is `0` and `[to]` is `[size - 1]` (e.g. `Range: bytes=0-99` for
a 100 byte file).

### Creating File Resources (POST)

A server MUST define one or more fixed URLs for clients to create new file
resources via `POST` requests (e.g `/files`).

All file resource creation requests MUST include a `Content-Range` and a
`Content-Length` header.

The `Content-Length` SHOULD be set to `0`, but clients MAY choose to upload some
or all bytes of a file when creating it.

A valid request MUST be acknowledged with a `201 Created` status by the server.
The response MUST also include a `Location` header that holds the absolute URL
of the created file resource.

Clients SHOULD also include meta headers , such as `Content-Type`,
`Content-Disposition`, and MAY also include headers to trigger server specific
behavior.

Servers MAY also define custom file size / request size limits and MUST respond
with `413 Request Entity Too Large` if the limits are exceeded.

### Uploading File Data (PUT)

Clients MUST use `PUT` requests in order to upload data to an existing file
resource (e.g. `/files/24e533e02ec3bc40c387f1a0e460e216`).

`PUT` requests MUST include a `Content-Length` header larger than `0`, as well
as a corresponding `Content-Range` header.

Servers MUST handle overlapping `PUT` requests in an idempotent fashion given
that the overlapping data is identical. Otherwise the behavior is undefined.

The `Range` response header indicates if a file has been received completely.

### Checking File Resources (HEAD)

Clients MUST use `HEAD` requests to inquire about the `Range` of data received
by an existing file resource.

## Appendix A - Discussion of Prior Art

*to be written ...*

**Prior art:**

* [YouTube Data API - Resumable Upload](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
* [Google Drive - Upload Files](https://developers.google.com/drive/manage-uploads)
* [Resumable Media Uploads in the Google Data Protocol](https://developers.google.com/gdata/docs/resumable_upload) (deprecated)
* [ResumableHttpRequestsProposal from Gears](http://code.google.com/p/gears/wiki/ResumableHttpRequestsProposal) (deprecated)

## Appendix B - Cross Domain Uploads

*to be written ...*

## Appendix C - Support for legacy / multipart clients

*to be written ...*

## License

Licensed under the MIT license, see
[LICENSE.txt](https://github.com/tus/tus-resumable-upload-protocol/blob/master/LICENSE.txt).

Copyright (c) 2013 Transloadit Ltd and Contributors.
