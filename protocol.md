# tus resumable upload protocol

**Version:** 1.0.0 ([SemVer](http://semver.org))<br>
**Date:** 2016-03-25<br>
**Authors:** [Felix Geisendörfer](https://twitter.com/felixge), [Kevin van
Zonneveld](https://twitter.com/kvz), [Tim Koschützki](https://twitter.com/tim_kos),
[Naren Venkataraman](https://github.com/vayam), [Marius
Kleidl](https://twitter.com/Acconut_)<br>
**Collaborators**:
[Bruno de Carvalho](https://github.com/biasedbit),
[James Butler](https://github.com/sandfox),
[Øystein Steimler](https://github.com/cybic),
[Sam Rijs](https://github.com/srijs),
[Khang Toh](https://github.com/khangtoh),
[Jacques Boscq](https://github.com/Amodio),
[Jérémy FRERE](https://github.com/jerefrer),
[Pieter Hintjens](https://github.com/hintjens),
[Stephan Seidt](https://github.com/ehd),
[Aran Wilkinson](https://github.com/aranw),
[Svein Ove Aas](https://github.com/Baughn),
[Oliver Anan](https://github.com/noptic),
[Tim](https://github.com/schmerg),
[j4james](https://github.com/j4james),
[Julian Reschke](https://github.com/reschke),
[Evert Pot](https://github.com/evert),
[Jochen Kupperschmidt](https://github.com/homeworkprod),
[Andrew Fenn](https://github.com/andrewfenn),
[Kevin Swiber](https://github.com/kevinswiber),
[Jan Kohlhof](https://github.com/0x20h),
[eno](https://github.com/radiospiel),
[Luke Arduini](https://github.com/luk-),
[Jim Schmid](https://github.com/sheeep),
[Jeffrey 'jf' Lim](https://github.com/jf),
[Daniel Lopretto](https://github.com/timemachine3030),
[Mark Murphy](https://github.com/MarkMurphy),
[Peter Darrow](https://github.com/pmdarrow),
[Gargaj](https://github.com/Gargaj),
[Tomasz Rydzyński](https://github.com/qsorix),
[Tino de Bruijn](https://github.com/tino),
[Jonas mg](https://github.com/kless),
[Christian Ulbrich](https://github.com/ChristianUlbrich),
[Jon Gjengset](https://github.com/jonhoo),
[Michael Elovskikh](https://github.com/wronglink),
[Rick Olson](https://github.com/technoweenie),
[J. Ryan Stinnett](https://convolv.es),
[Ifedapo Olarewaju](https://github.com/ifedapoolarewaju)
[Robert Nagy](https://github.com/ronag),
[Felix Schwarz](https://github.com/felix-schwarz)

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
[implementations](https://www.tus.io/implementations.html) page.

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
Upload-Offset: 100
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

If the version specified by the Client is not supported by the Server, it
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

#### X-HTTP-Method-Override

The `X-HTTP-Method-Override` request header MUST be a string which MUST be
interpreted as the request's method by the Server, if the header is presented.
The actual method of the request MUST be ignored. The Client SHOULD use this
header if its environment does not support the PATCH or DELETE methods.

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
`Content-Type: application/offset+octet-stream`, otherwise the server SHOULD
return a `415 Unsupported Media Type` status.

The `Upload-Offset` header's value MUST be equal to the current offset of the
resource. In order to achieve parallel upload the
[Concatenation](#concatenation) extension MAY be used. If the offsets do not
match, the Server MUST respond with the `409 Conflict` status without modifying
the upload resource.

The Client SHOULD send all the remaining bytes of an upload in a single `PATCH`
request, but MAY also use multiple small requests successively for scenarios
where this is desirable. One example for these situations is when the
[Checksum](#checksum) extension is used.

The Server MUST acknowledge successful `PATCH` requests with the
`204 No Content` status. It MUST include the `Upload-Offset` header containing
the new offset. The new offset MUST be the sum of the offset before the `PATCH`
request and the number of bytes received and processed or stored during the
current `PATCH` request.

If the server receives a `PATCH` request against a non-existent resource
it SHOULD return a `404 Not Found` status.

Both Client and Server, SHOULD attempt to detect and handle network errors
predictably. They MAY do so by checking for read/write socket errors, as well
as setting read/write timeouts. A timeout SHOULD be handled by closing the underlying connection.

The Server SHOULD always attempt to store as much of the received data as possible.

#### OPTIONS

An `OPTIONS` request MAY be used to gather information about the Server's current
configuration. A successful response indicated by the `204 No Content` or `200 OK` status
MUST contain the `Tus-Version` header. It MAY include the `Tus-Extension` and
`Tus-Max-Size` headers.

The Client SHOULD NOT include the `Tus-Resumable` header in the request and the
Server MUST ignore the header.

##### Example

This example clarifies the response for an `OPTIONS` request. The version used
in the response is `1.0.0` while the Server is also capable of
handling `0.2.2` and `0.2.1`. Uploads with a total size of up to 1GB are
allowed and the extensions for [Creation](#creation) and
[Expiration](#expiration) are enabled.

**Request:**

```
OPTIONS /files HTTP/1.1
Host: tus.example.org
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
`Upload-Length` header indicates the size of the entire upload in bytes.

**Request:**

```
POST /files HTTP/1.1
Host: tus.example.org
Content-Length: 0
Upload-Length: 100
Tus-Resumable: 1.0.0
Upload-Metadata: filename d29ybGRfZG9taW5hdGlvbl9wbGFuLnBkZg==,is_confidential
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
The value MAY be empty. In these cases, the space, which would normally separate
the key and the value, MAY be left out.

Since metadata can contain arbitrary binary values, Servers SHOULD
carefully validate metadata values or sanitize them before using them
as header values to avoid header smuggling.

#### Requests

##### POST

The Client MUST send a `POST` request against a known upload creation URL to
request a new upload resource. The request MUST include one of the following headers:

a) `Upload-Length` to indicate the size of an entire upload in bytes.

b) `Upload-Defer-Length: 1` if upload size is not known at the time. Once it is
known the Client MUST set the `Upload-Length` header in the next `PATCH` request.
Once set the length MUST NOT be changed. As long as the length of the upload is
not known, the Server MUST set `Upload-Defer-Length: 1` in all responses to
`HEAD` requests. If the `Upload-Defer-Length` header contains any other value
than `1` the server should return a `400 Bad Request` status.

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

### Creation With Upload

The Client MAY include parts of the upload in the initial Creation request
using the Creation With Upload extension.

If the Server supports this extension, it MUST advertise this by including
`creation-with-upload` in the `Tus-Extension` header. Furthermore, this extension
depends directly on the Creation extension. Therefore, if the Server does not
offer the Creation extension, it MUST NOT offer the Creation With Upload
extension either.

The Client MAY include either the entirety or a chunk of the upload data in the body of
the `POST` request. In this case, similar rules as for the `PATCH` request and
response apply. The Client MUST include the
`Content-Type: application/offset+octet-stream` header. The Server SHOULD accept
as many bytes as possible and MUST include the `Upload-Offset` header in the
response and MUST set its value to the offset of the upload after applying the
accepted bytes.

If the Client wants to use this extension, the Client SHOULD verify that it is
supported by the Server before sending the `POST` request.
In addition, the Client SHOULD include the `Expect: 100-continue` header in
the request to receive early feedback from the Server on whether it will accept
the creation request, before attempting to transfer the first chunk.

#### Example

A non-empty `POST` request is used to create a new upload resource. The
`Upload-Offset` header in the response indicates how much data has been accepted.

**Request:**

```
POST /files HTTP/1.1
Host: tus.example.org
Content-Length: 5
Upload-Length: 100
Tus-Resumable: 1.0.0
Content-Type: application/offset+octet-stream

hello
```

**Response:**

```
HTTP/1.1 201 Created
Location: https://tus.example.org/files/24e533e02ec3bc40c387f1a0e460e216
Tus-Resumable: 1.0.0
Upload-Offset: 5
```


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
Upload-Offset: 100
```

#### Headers

##### Upload-Expires

The `Upload-Expires` response header indicates the time after which the unfinished upload
expires. A Server MAY wish to remove incomplete uploads after a given
period of time to prevent abandoned uploads from taking up extra storage. The
Client SHOULD use this header to determine if an upload is still valid before
attempting to resume the upload.

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
characters with the modification that uppercase characters are excluded.

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
```

**Response**:

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
Upload-Offset: 11
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
confirming that the upload was terminated. For all future requests to this URL,
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

In order to create a new final upload, the Client MUST add the `Upload-Concat` header
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

The response to a HEAD request for a final upload SHOULD NOT contain the `Upload-Offset`
header unless the concatenation has been successfully finished. After successful
concatenation, the `Upload-Offset` and `Upload-Length` MUST be set and their values MUST be
equal. The value of the `Upload-Offset` header before concatenation is not defined for a
final upload.

The response to a HEAD request for a partial upload MUST contain the `Upload-Offset` header.

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

In the following example, the `Host` and `Tus-Resumable` headers are omitted for
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

In the first request, the string `hello` was uploaded while the second file now
contains ` world` with a leading space.

The next step is to create the final upload consisting of the two earlier
generated partial uploads. In the following request, no `Upload-Length` header is
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

### Challenge

With this extension, Clients can authenticate follow-up requests to a [Creation](#creation) or [Creation With Upload](#creation-with-upload) 
`POST` request using a high-entropy cryptographic random shared secret - and challenges
based thereon. The idea is that only the user, who created the upload, should be able to
obtain information about the upload and continue the upload.

If the Server supports this extension, it MUST add `challenge` to the `Tus-Extension` header.

The Client MAY add the `Upload-Secret` header to `POST` requests, if it wants to protect the
upload using the Challenge extension. All subsequent request targeting that upload resource MUST contain
the corresponding `Upload-Challenge` header. These requests include but are not limited to:
- `HEAD` requests to an upload URL
- `PATCH` requests to an upload URL
- `DELETE` requests to an upload URL
- `HEAD` requests to the upload creation URL with an `Upload-Tag` header
- `POST` requests to the upload creation URL with an `Upload-Concat` header

The Server MUST support at least the SHA256 challenge algorithm identified
by `sha256`. The names of the challenge algorithms MUST only consist of ASCII
characters with the modification that uppercase characters are excluded.

The `Tus-Challenge-Algorithm` header MUST be included in the response to an
`OPTIONS` request.

If the request includes a challenge algorithm which is not supported by the Server or an
otherwise syntactically invalid `Upload-Challenge` header, the Server MUST respond with
a `400 Bad Request` status. Furthermore, Servers MUST respond with a `404 Not Found`
status to requests with a missing or mismatching `Upload-Challenge` value if they
relate to an upload resource for which an `Upload-Secret` was provided upon creation.

The connection between the Client and the Server SHOULD be encrypted and protected against tampering
and eavesdropping using HTTPS. Otherwise the protection provided by the Challenge extension can be
undermined.

#### Headers

##### Upload-Secret

The `Upload-Secret` MUST be a high-entropy cryptographic random string consisting
of only following, [printable ASCII characters](https://en.wikipedia.org/wiki/ASCII#Printable_characters):

```
!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~
```

This list contains the ASCII characters with a decimal code in the range of `[33, 126]`. Be aware
that this list does neither contain the "space" character (decimal code: 32) nor the "delete" character
(decimal code: 127).

In addition, the length of the header's value MUST be between 48 and 256 characters.

The `Upload-Secret` header MUST NOT be included with anything but `POST` requests
that create a new upload resource. Servers receiving an `Upload-Secret` header with
any other request MUST respond with a `400 Bad Request` status.

##### Upload-Challenge

The value of `Upload-Challenge` MUST be computed as follows:

```
Upload-Challenge = [Hash Name] + " " + Hash([HTTP Method] + [Upload-Offset] + [Upload-Secret]))
```

with following replacements:

* `[Hash Name]` MUST be replaced by the hashing algorithm used for computing the challenge value
as contained in the `Tus-Challenge-Algorithm` response header.
* `[HTTP Method]` MUST be replaced by the *effective* HTTP method of the request
that the `Upload-Challenge` is sent with. If the `X-HTTP-Method-Override` header is
used in the same request, it MUST be replaced with the value of `X-HTTP-Method-Override`.
* `[Upload-Offset]` MUST be replaced with the value of the request's `Upload-Offset` header,
if the request includes this header (e.g. for `PATCH` requests). If the request does not include
the `Upload-Offset` header, it MUST be replaced with the character `#`.
* `[Uploaf-Secret]` MUST be replaced with the value of the `Upload-Secret` header from the
`POST` request that created the upload resource.

The input of the hash algorithm (denoted by `Hash` in the above formula) MUST be encoded as
an ASCII string. Its output MUST be Base64 encoded.

For requests that reference multiple upload resources (e.g. when using the [Concatenation](#concatenation) extension),
the `Upload-Challenge` is computed by concatenating the `Upload-Challenge`s of the individual upload resources for the request in the
order they are referenced. The SHA256 checksum computed over the concatenated `Upload-Challenge`s
is then used as the `Upload-Challenge` for the request:

```
Upload-Challenge = [Hash Name] + " " + Hash([Upload-Challenge for resource 1] + … + [Upload-Challenge for resource n])
```

##### Tus-Challenge-Algorithm

The `Tus-Challenge-Algorithm` response header MUST be a comma-separated list of
the challenge algorithms supported by the server.

#### Examples

An upload resource is created with [Creation With Upload](#creation-with-upload) and an `Upload-Secret`:

```
POST /files HTTP/1.1
Upload-Length: 100
Upload-Secret: R290Y2hhISBVc2UgYW4gYWN0dWFsIGhpZ2gtZW50cm9weSBzb3
Content-Length: 5
Content-Type: application/offset+octet-stream
Tus-Resumable: 1.0.0

hello
```

The upload is continued with a `PATCH` request, including an `Upload-Challenge` computed as

```
Upload-Challenge = "sha256" + " " + SHA256("PATCH" + "5" + "R290Y2hhISBVc2UgYW4gYWN0dWFsIGhpZ2gtZW50cm9weSBzb3")
```

and included in the request:

```
PATCH /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Upload-Offset: 5
Upload-Challenge: sha256 B6KrLwZkX3ZLYk5AjZJ6aaOt9G90+h7k/f/0P2bDTDc=
Content-Length: 50
Content-Type: application/offset+octet-stream
Tus-Resumable: 1.0.0

[50 bytes of content]
```

Then, a `DELETE` request for the upload is sent, including an `Upload-Challenge` computed as

```
Upload-Challenge = "sha256" + " " + SHA256("DELETE" + "0" + "R290Y2hhISBVc2UgYW4gYWN0dWFsIGhpZ2gtZW50cm9weSBzb3")
```

and included in the request:

```
DELETE /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Content-Length: 0
Upload-Challenge: sha256 wXpYXc7iXsPSXHMtrlzkMvnFTEenmtc4YyEPGaCN1VU=
Tus-Resumable: 1.0.0
```

Two uploads - each with its own `Upload-Secret` - are concatenated, including an `Upload-Challenge`. For `/files/a`, the `Upload-Challenge` is computed as:

```
Upload-Challenge A
	= "sha256" + " " + SHA256("POST" + "0" + "VGhpcyBpc24ndCBoaWdoLWVudHJvcHkgZWl0aGVyLiBEb24ndC")
	= "sha256 sXfhFCwyWMjnH1DMPkArsByfa4FEGtpf3LsAt6uDkTU="
```

For `/files/b`, the `Upload-Challenge` is computed as:

```
Upload-Challenge B
	= "sha256" + " " + SHA256("POST" + "0" + "M3JkIHRpbWUncyBhIGNoYXJtISBPciBzbyB0aGV5IHNheS4gRG")
	= "sha256 JbVm0kH59MDQfGtzjJ3s9oBjzHp+Yqtv7O2/OzYTUqg="
```

Finally, the challenges of the two files are concatenated in the order they are referenced in the request, and then hashed:

```
Upload-Challenge
	= "sha256" + " " + SHA256("sha256 sXfhFCwyWMjnH1DMPkArsByfa4FEGtpf3LsAt6uDkTU=" + "sha256 JbVm0kH59MDQfGtzjJ3s9oBjzHp+Yqtv7O2/OzYTUqg=")
	= "sha256 jWk0GUnLo2QNZaY3zHZ1N/Rgf7EWHtFI677w1mB5aMg="
```

The resulting `Upload-Challenge` is then sent with the request:

```
POST /files HTTP/1.1
Upload-Concat: final;/files/a /files/b
Upload-Challenge: sha256 jWk0GUnLo2QNZaY3zHZ1N/Rgf7EWHtFI677w1mB5aMg=
Content-Length: 0
Tus-Resumable: 1.0.0
```

## FAQ

The FAQ is available online at <https://tus.io/faq.html>.

## License

Licensed under the MIT license, see
[LICENSE.txt](https://github.com/tus/tus-resumable-upload-protocol/blob/master/LICENSE.txt).

Copyright (c) 2013-2016 Transloadit Ltd and Contributors.
