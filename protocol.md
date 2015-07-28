# tus resumable upload protocol

**Version:** 1.0.0 ([SemVer](http://semver.org))<br>
**Date:** 2014-01-26<br>
**Authors:** [Felix Geisendörfer](https://twitter.com/felixge), [Kevin van
Zonneveld](https://twitter.com/kvz), [Tim Koschützki](https://twitter.com/tim_kos),
[Naren Venkataraman](https://github.com/vayam), [Marius
Kleidl](https://twitter.com/Acconut_)

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](http://www.ietf.org/rfc/rfc2119.txt).

## Status

Following [SemVer](http://semver.org), as of 1.0.0 tus is ready for general
adoption. We don't expect to make breaking changes, but if we do, those will
have to be in a 2.0.0. Introducing a new extension or any backwards-compatible
change adding new functionality will result in a bumped MINOR version.

## Contributing

This protocol is authored and owned by the tus community. We welcome patches
and feedback via
[GitHub](https://github.com/tus/tus-resumable-upload-protocol). All authors and
collaborators will be listed as such in the protocol header.

Please also [let us know](https://github.com/tus/tus.io/issues/new) about any
implementations (open source or commercial) if you'd like to be listed on the
[implementations](http://www.tus.io/implementations.html) page.

## Abstract

The protocol provides a mechanism for resumable file uploads via HTTP/1.1 ([RFC
7230](https://tools.ietf.org/html/rfc7230)) and HTTP/2 ([RFC
7540](https://tools.ietf.org/html/rfc7540)).

## Notation

Characters enclosed by square brackets indicate a placeholder (e.g. `[size]`).

The terms space, comma, and semicolon refer to their ASCII representations.

## Core Protocol

The core protocol describes how to resume an interrupted upload. It assumes that
you already have a URL for the upload, usually created via the
[Creation](#creation) extension.

All Clients and Servers MUST implement the core protocol.

This specification does not describe the structure of URLs, as that is left for
the specific implementation to decide.  All URLs shown in this document are
meant for example purposes only.

In addition, the implementation of authentication and authorization is left for
the Server to decide.

### Example

A `HEAD` request is used to determine the offset at which the upload should be
continued.

The example below shows the continuation of a 100 byte upload that was
interrupted after 70 bytes were transferred.

**Request:**

```
HEAD /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Tus-Resumable: 1.0.0
```

**Response:**

```
HTTP/1.1 200 OK
Upload-Offset: 70
Tus-Resumable: 1.0.0
```

Given the offset, the Client uses the `PATCH` method to resume the upload:


**Request:**

```
PATCH /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Type: application/offset+octet-stream
Content-Length: 30
Upload-Offset: 70
Tus-Resumable: 1.0.0

[remaining 30 bytes]
```

**Response:**

```
HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
```

### Headers

#### Upload-Offset

The `Upload-Offset` request and response header indicates a byte offset within a
resource. The value MUST be a non-negative integer.

#### Upload-Length

The `Upload-Length` request and response header indicates the size of the entire
upload in bytes. The value MUST be a non-negative integer.

#### Tus-Version

The `Tus-Version` response header MUST be a comma-separated list of protocol versions
supported by the Server. The list MUST be sorted by Server's preference
where the first one is the most preferred one.

#### Tus-Resumable

The `Tus-Resumable` header MUST be included in every request and response except
for `OPTIONS` requests. The value MUST be the version of the protocol used by
the Client or the Server.

If the the version specified by the Client is not supported by the Server, it
MUST respond with the `412 Precondition Failed` status and MUST include the
`Tus-Version` header into the response.
In addition, the Server MUST NOT process the request.

#### Tus-Extension

The `Tus-Extension` response header MUST be a comma-separated list of the extensions
supported by the Server. If no extensions are supported, the `Tus-Extension`
header MUST be omitted.

#### Tus-Max-Size

The `Tus-Max-Size` response header MUST be a non-negative integer indicating the maximum
allowed size of an entire upload in bytes. The Server SHOULD set this header if
there is a known hard limit.

### Requests

#### HEAD

The Server MUST always include the `Upload-Offset` header in the response for a
`HEAD` request, even if the offset is `0`, or the upload is already considered
completed. If the size of the upload is known, the Server MUST include the
`Upload-Length` header in the response. If the resource is not found, the Server
SHOULD return either the `404 Not Found`, `410 Gone` or `403 Forbidden` status
without the `Upload-Offset` header.

The Server MUST prevent the client and/or proxies from caching the response by
adding the `Cache-Control: no-store` header to the response.

#### PATCH

The Server SHOULD accept `PATCH` requests against any upload URL and apply the
bytes contained in the message at the given offset specified by the
`Upload-Offset` header. All `PATCH` requests MUST use
`Content-Type: application/offset+octet-stream`.

The `Upload-Offset` header's value MUST be equal to the current offset of the
resource. In order to achieve parallel upload the
[Concatenation](#concatenation) extension MAY be used. If the offsets do not
match, the Server MUST respond with the `409 Conflict` status without modifying
the upload resource.

The Client SHOULD send all the remaining bytes of an upload in a single `PATCH`
request, but MAY also use multiple small requests successively for scenarios
where this is desirable, for example, if the [Checksum](#checksum) extension is
used.

The Server MUST acknowledge successful `PATCH` requests with the
`204 No Content` status. It MUST include the `Upload-Offset` header containing
the new offset. The new offset MUST be the sum of the offset before the `PATCH`
request and the number of bytes received and processed or stored during the
current `PATCH` request.

Both, Client and Server, SHOULD attempt to detect and handle network errors
predictably. They MAY do so by checking for read/write socket errors, as well
as setting read/write timeouts. A timeout SHOULD be handled by closing the underlying connection.

The Server SHOULD always attempt to store as much of the received data as possible.

#### OPTIONS

An `OPTIONS` request MAY be used to gather information about the Server's current
configuration. A successful response indicated by the `204 No Content` status
MUST contain the `Tus-Version` header. It MAY include the `Tus-Extension` and
`Tus-Max-Size` headers.

The Client SHOULD NOT include the `Tus-Resumable` header in the request and the
Server MUST discard it.

##### Example

This example clarifies the response for an `OPTIONS` request. The version used
in both, request and response, is `1.0.0` while the Server is also capable of
handling `0.2.2` and `0.2.1`. Uploads with a total size of up to 1GB are
allowed and the extensions for [Creation](#creation) and
[Expiration](#expiration) are enabled.

**Request:**

```
OPTIONS /files HTTP/1.1
Host: tus.example.org
Tus-Resumable: 1.0.0
```

**Response:**

```
HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
Tus-Version: 1.0.0,0.2.2,0.2.1
Tus-Max-Size: 1073741824
Tus-Extension: creation,expiration
```

## Protocol Extensions

Clients and Servers are encouraged to implement as many of the extensions
as possible. Feature detection SHOULD be achieved by the Client sending an
`OPTIONS` request and the Server responding with the `Tus-Extension` header.

### Creation

The Client and the Server SHOULD implement the upload creation extension. If
the Server supports this extension, it MUST add `creation` to the `Tus-Extension`
header.

#### Example

An empty `POST` request is used to create a new upload resource. The
`Upload-Length` header indicates the size of entire upload in bytes.

**Request:**

```
POST /files HTTP/1.1
Host: tus.example.org
Content-Length: 0
Upload-Length: 100
Tus-Resumable: 1.0.0
Upload-Metadata: filename d29ybGRfZG9taW5hdGlvbl9wbGFuLnBkZg==
```

**Response:**

```
HTTP/1.1 201 Created
Location: https://tus.example.org/files/24e533e02ec3bc40c387f1a0e460e216
Tus-Resumable: 1.0.0
```

The new resource has an implicit offset of `0` allowing the Client to use the
core protocol for performing the actual upload.

#### Headers

##### Upload-Defer-Length

The `Upload-Defer-Length` request and response header indicates that the size of
the upload is not known currently and will be transferred later. Its value MUST
be `1`. If the length of an upload is not deferred, this header MUST be omitted.

##### Upload-Metadata

The `Upload-Metadata` request and response header MUST consist of one or more comma-separated
key-value pairs. The key and value MUST be separated by a space. The key
MUST NOT contain spaces and commas and MUST NOT be empty. The key SHOULD be
ASCII encoded and the value MUST be Base64 encoded. All keys MUST be unique.

#### Requests

##### POST

The Client MUST send a `POST` request against a known upload creation URL to
request a new upload resource. The request MUST include one of the following headers:

a) `Upload-Length` to indicate the size of an entire upload in bytes.

b) `Upload-Defer-Length: 1` if upload size is not known at the time. Once it is
known the Client MUST set the `Upload-Length` header in the next `PATCH` request.
Once set the length MUST NOT be changed. As long as the length of the upload is
not known, the Server MUST set `Upload-Defer-Length: 1` in all responses to
`HEAD` requests.

If the Server supports deferring length, it MUST add `creation-defer-length` to
the `Tus-Extension` header.

The Client MAY supply the `Upload-Metadata` header to add additional metadata to the
upload creation request. The Server MAY decide to ignore or use this information to
further process the request or to reject it. If an upload contains additional
metadata, responses to `HEAD` requests MUST include the `Upload-Metadata` header
and its value as specified by the Client during the creation.

If the length of the upload exceeds the maximum, which MAY be specified using
the `Tus-Max-Size` header, the Server MUST respond with the
`413 Request Entity Too Large` status.

The Server MUST acknowledge a successful upload creation with the `201 Created`
status. The Server MUST set the `Location` header to the URL of the created
resource. This URL MAY be absolute or relative.

The Client MUST perform the actual upload using the core protocol.

### Expiration

The Server MAY remove unfinished uploads once they expire. In order to indicate
this behavior to the Client, the Server MUST add `expiration` to the
`Tus-Extension` header.

#### Example

The unfinished upload is available until the time specified in `Upload-Expires`.
After this date the upload can not be resumed.

**Request:**

```
PATCH /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Type: application/offset+octet-stream
Content-Length: 30
Upload-Offset: 70
Tus-Resumable: 1.0.0

[remaining 30 bytes]
```

**Response:**

```
HTTP/1.1 204 No Content
Upload-Expires: Wed, 25 Jun 2014 16:00:00 GMT
Tus-Resumable: 1.0.0
```

#### Headers

##### Upload-Expires

The `Upload-Expires` response header indicates the time after which the unfinished upload
expires. A Server MAY wish to remove incomplete uploads after a given
period of time to prevent abandoned uploads from taking up extra storage. The
Client SHOULD use this header to determine if an upload is still valid before
attempting to the resume the upload.

This header MUST be included in every `PATCH` response if the upload is going
to expire. If the expiration is known at the creation, the `Upload-Expires`
header MUST be included in the response to the initial `POST` request.
Its value MAY change over time.

If a Client does attempt to resume an upload which has since been removed by the
Server, the Server SHOULD respond with the`404 Not Found` or `410 Gone` status.
The latter one SHOULD be used if the Server is keeping track of expired uploads.
In both cases the Client SHOULD start a new upload.

The value of the `Upload-Expires` header MUST be in
[RFC 7231](https://tools.ietf.org/html/rfc7231#section-7.1.1.1) datetime format.

### Checksum

The Client and the Server MAY implement and use this extension to verify data
integrity of each `PATCH` request. If supported, the Server MUST add `checksum`
to the `Tus-Extension` header.

A Client MAY include the `Upload-Checksum` header in a `PATCH` request.
Once the entire request has been received, the Server MUST verify the uploaded
chunk against the provided checksum using the specified algorithm. Depending on
the result the Server MAY respond with one of the following status code:
1) `400 Bad Request` if the checksum algorithm is not supported by the server,
2) `460 Checksum Mismatch` if the checksums mismatch or
3) `204 No Content` if the checksums match and the processing of the data
succeeded.
In the first two cases the uploaded chunk MUST be discarded, and the upload and
its offset MUST NOT be updated.

The Server MUST support at least the SHA1 checksum algorithm identified
by `sha1`. The names of the checksum algorithms MUST only consist of ASCII
characters expect uppercased letters.

The `Tus-Checksum-Algorithm` header MUST be included in the response to an
`OPTIONS` request.

If the hash cannot be calculated at the beginning of the upload, it MAY be
included as a trailer. If the Server can handle trailers, this behavior MUST be
announced by adding `checksum-trailer` to the `Tus-Extension` header.
Trailers, also known as trailing headers, are headers which are sent after the
request's body has been transmitted already. Following
[RFC 7230](https://tools.ietf.org/html/rfc7230#section-4.1.2) they
MUST be announced using the `Trailer` header and are only allowed in chunked
transfers.

#### Headers

##### Tus-Checksum-Algorithm

The `Tus-Checksum-Algorithm` response header MUST be a comma-separated list of
the checksum algorithms supported by the server.

##### Upload-Checksum

The `Upload-Checksum` request header contains information about the checksum of
the current body payload. The header MUST consist of the name of the used
checksum algorithm and the Base64 encoded checksum separated by a space.

#### Example

**Request**:

```
OPTIONS /files HTTP/1.1
Host: tus.example.org
Tus-Resumable: 1.0.0
```

*Response**:

```
HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
Tus-Version: 1.0.0
Tus-Extension: checksum
Tus-Checksum-Algorithm: md5,sha1,crc32
```

**Request**:

```
PATCH /files/17f44dbe1c4bace0e18ab850cf2b3a83 HTTP/1.1
Content-Length: 11
Upload-Offset: 0
Tus-Resumable: 1.0.0
Upload-Checksum: sha1 Kq5sNclPz7QV2+lfQIuc6R7oRu0=

hello world
```

**Response**:

```
HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
```

### Termination

This extension defines a way for the Client to terminate completed and unfinished
uploads allowing the Server to free up used resources.

If this extension is supported by the Server, it MUST be announced by adding
`termination` to the `Tus-Extension` header.

#### Requests

##### DELETE

When receiving a `DELETE` request for an existing upload the Server SHOULD free
associated resources and MUST respond with the `204 No Content` status
confirming that the upload was terminated. For all future requests to this URL
the Server SHOULD respond with the `404 Not Found` or `410 Gone` status.

#### Example

**Request:**

```
DELETE /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Length: 0
Tus-Resumable: 1.0.0
```

**Response:**

```
HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
```

### Concatenation

This extension can be used to concatenate multiple uploads into a single one enabling
Clients to perform parallel uploads and to upload non-contiguous chunks. If the
Server supports this extension, it MUST add `concatenation` to the
`Tus-Extension` header.

A partial upload represents a chunk of a file. It is constructed by including the
`Upload-Concat: partial` header while creating a new upload using the
[Creation](#creation) extension. Multiple partial uploads are concatenated
into a final upload in the specified order. The Server SHOULD NOT process these
partial uploads until they are concatenated to form a final upload. The length of the
final upload MUST be the sum of the length of all partial uploads.

In order to create a new final upload the Client MUST add the `Upload-Concat` header
to the upload creation request. The value MUST be `final` followed by a semicolon
and a space-separated list of the partial upload URLs that need to be concatenated.
The partial uploads MUST be concatenated as per the order specified in the list.
This concatenation request SHOULD happen after all of the corresponding partial uploads
are completed. The Client MUST NOT include the `Upload-Length` header in the final
upload creation.

The Client MAY send the concatenation request while the partial uploads are still
in progress. This feature MUST be explicitly announced by the Server by adding
`concatenation-unfinished` to the `Tus-Extension` header.

When creating a new final upload the partial uploads' metadata SHALL NOT be
transferred to the new final upload. All metadata SHOULD be included in the
concatenation request using the `Upload-Metadata` header.

The Server MAY delete partial uploads after concatenation. They MAY however be
used multiple times to form a final resource.

The Server MUST respond with the `403 Forbidden` status to `PATCH` requests against
a final upload URL and MUST NOT modify the final or its partial uploads.

The response to a `HEAD` request SHOULD NOT contain the `Upload-Offset` header unless
the concatenation has been successfully finished. After successful concatenation, the
`Upload-Offset` and `Upload-Length` MUST be set and their values MUST be equal.
The value of the `Upload-Offset` header before concatenation is not defined.

The `Upload-Length` header MUST be included if the length of the final resource can
be calculated at the time of the request. Response to `HEAD` request against partial
or final upload MUST include the `Upload-Concat` header and its value as received in
the upload creation request.

#### Headers

##### Upload-Concat

The `Upload-Concat` request and response header MUST be set in both partial and final upload creation
requests. It indicates whether the upload is either a partial
or final upload. If the upload is a partial one, the header value MUST be `partial`.
In the case of a final upload, its value MUST be `final` followed by a
semicolon and a space-separated list of partial upload URLs that will be
concatenated. The partial uploads URLs MAY be absolute or relative and MUST NOT contain
spaces as defined in [RFC 3986](https://tools.ietf.org/html/rfc3986).

#### Example

In the following example the `Host` and `Tus-Resumable` headers are omitted for
readability although they are required by the specification.
In the beginning two partial uploads are created:

```
POST /files HTTP/1.1
Upload-Concat: partial
Upload-Length: 5

HTTP/1.1 201 Created
Location: https://tus.example.org/files/a
```
```
POST /files HTTP/1.1
Upload-Concat: partial
Upload-Length: 6

HTTP/1.1 201 Created
Location: https://tus.example.org/files/b
```

You are now able to upload data to the two partial resources using `PATCH`
requests:

```
PATCH /files/a HTTP/1.1
Upload-Offset: 0
Content-Length: 5

hello

HTTP/1.1 204 No Content
```
```
PATCH /files/b HTTP/1.1
Upload-Offset: 0
Content-Length: 6

 world

HTTP/1.1 204 No Content
```

In the first request the string `hello` was uploaded while the second file now
contains ` world` with a leading space.

The next step is to create the final upload consisting of the two earlier
generated partial uploads. In following request no `Upload-Length` header is
presented.

```
POST /files HTTP/1.1
Upload-Concat: final;/files/a /files/b

HTTP/1.1 201 Created
Location: https://tus.example.org/files/ab
```

The length of the final resource is now 11 bytes consisting of the string
`hello world`.

```
HEAD /files/ab HTTP/1.1

HTTP/1.1 200 OK
Upload-Length: 11
Upload-Concat: final;/files/a /files/b
```

## FAQ

### Why is the protocol using custom headers?

We have carefully investigated the use of existing headers such as `Range` and
`Content-Range`, but unfortunately they are defined in a way that makes them
unsuitable for resumable file uploads.

We also considered using existing `PATCH` payload formats such as
[multipart/byteranges](http://greenbytes.de/tech/webdav/draft-ietf-httpbis-p5-range-latest.html#internet.media.type.multipart.byteranges),
but unfortunately the XHR2 [FormData
interface](http://www.w3.org/TR/XMLHttpRequest/#interface-formdata) does not
support custom headers for multipart parts, and the [send()
method](http://www.w3.org/TR/XMLHttpRequest/#the-send-method) does not allow
streaming arbitrary data without loading all of it into memory.

That being said, custom headers also allowed us to greatly simplify the
Client and Server implementations, so we're quite happy with them.

### Why are you not using the "X-" prefix for your headers?

The "X-" prefix for headers has been deprecated, see [RFC
6648](http://tools.ietf.org/html/rfc6648).

### How can I deal with bad HTTP proxies?

If you are dealing with HTTP proxies that strip/modify HTTP headers or can't
handle `PATCH` requests properly, you should consider using HTTPS which will
make it impossible for proxies to modify your requests.

If that is not an option for you, please reach out to us, we are open to
defining a compatibility protocol extension.

### How are pause/resume handled? When should I delete partial uploads?

The tus protocol is built upon the principles of simple pausing and resuming. In
order to pause an upload you are allowed to end the current open request. The
Server will store the uploaded data as long as no violations against other
constraints (e.g. checksums) or internal errors occur. Once you are ready to
resume an upload, send a `HEAD` request to the corresponding upload URL in order to
obtain the available offset. After receiving a valid response you can upload
more data using `PATCH` requests. You should keep in mind that the Server may
delete an unfinished upload if it is not continued for a longer time period (see
[Expiration](#expiration) extension).

Before deleting an outstanding upload the Server should give the Client enough
time to resolve potential networking issues. Since this duration depends heavily
on the underlying application model, the protocol does not contain a specific
number, but we recommend one week for a general use case.

## License

Licensed under the MIT license, see
[LICENSE.txt](https://github.com/tus/tus-resumable-upload-protocol/blob/master/LICENSE.txt).

Copyright (c) 2013-2015 Transloadit Ltd and Contributors.
