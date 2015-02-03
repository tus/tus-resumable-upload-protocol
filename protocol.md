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

The protocol provides a mechanism for resumable file uploads via HTTP 1.1 ([RFC
2616](http://tools.ietf.org/html/rfc2616)).

## Notation

Characters enclosed by square brackets indicate a placeholder (e.g. `[size]`).

## Core Protocol

The core protocol describes how to resume an interrupted upload. It assumes that
you already have a URL for the upload, usually created via the [File
Creation](#file-creation) extension.

All clients and servers MUST implement the core protocol.

This specification does not describe the struture of URLs, as that is left for
the specific implementation to decide.  All URLs shown in this document are
meant for example purposes only.

In addition, the implementation of authentication is left for the server to
decide.

### Example

A HEAD request is used to determine the offset at which the upload should be
continued.

The example below shows the continuation of a 100 byte upload that was
interrupted after 70 bytes were transfered.

**Request:**

```
HEAD /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
TUS-Resumable: 1.0.0
```

**Response:**

```
HTTP/1.1 204 No Content
Offset: 70
TUS-Resumable: 1.0.0
```

Given the offset, the client uses the PATCH method to resume the upload:


**Request:**

```
PATCH /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Type: application/offset+octet-stream
Content-Length: 30
Offset: 70
TUS-Resumable: 1.0.0

[remaining 30 bytes]
```

**Response:**

```
HTTP/1.1 204 No Content
TUS-Resumable: 1.0.0
```

### Headers

#### Offset

The `Offset` header is a request and response header that indicates a byte
offset within a resource. The value MUST be an integer that is `0` or larger.

#### TUS-Resumable

The `TUS-Resumable` header MUST be sent in every response and resquest. Its
value is a string set to the current version of the used tus resumable upload
protocol by the client or server.

If the client requests the use of a version which is not supported by the server
latter one MUST return `412 Precondition Failed` without processing the request
further.

#### TUS-Extension

This header MUST be a comma-separated list of the extensions supported by the
server. If no extensions are supported `TUS-Extension` MAY be omitted.

#### TUS-Max-Size

The `TUS-Max-Size` header MUST be a non-negative integer indicating the maximum
allowed size of a single fully uploaded file in bytes. If no hard-limit is
presented or the server is not able to calculate it this header MUST be omitted.

#### TUS-Version

This header MUST be a comma-separated list of the supported versions of the tus
resumable upload protocol by the server. The lists elements are sorted by the
server's preference whereas the first element is the most preferred one.

### Requests

#### HEAD

Servers MUST always return an `Offset` header for `HEAD` requests against a tus
resource, even if it is `0`, or the upload is already considered completed.
If the tus resource is not found Servers MUST return either `404` or `403` 
without `Offset` Header.

#### PATCH

Servers MUST accept `PATCH` requests against any tus resource and apply the
bytes contained in the message at the given `Offset`. All `PATCH` requests
MUST use `Content-Type: application/offset+octet-stream`.

The `Offset` value MUST be equal to the current offset of the resource. In order
to achieve parallel upload the Merge extension MAY be used. If the offsets
do not match the server MUST return the `409 Conflict` status code without
modifying the upload resource.

Clients SHOULD send all remaining bytes of a resource in a single `PATCH`
request, but MAY also use multiple small requests for scenarios where this is
desirable (e.g. NGINX buffering requests before they reach their backend).

Servers MUST acknowledge successful `PATCH` operations using a `204 No Content`
or `200 Ok` status, which implicitly means that clients can assume that the new
`Offset` = `Offset` \+ `Content-Length`.

If the clients sends an `Expect` request-header field with the `100-continue`
expectation the server SHOULD return the `100 Continue` status code before
reading the request's body and sending the final response.

Both clients and servers SHOULD attempt to detect and handle network errors
predictably. They may do so by checking for read/write socket errors, as well
as setting read/write timeouts. Both clients and servers SHOULD use a 30 second
timeout. A timeout SHOULD be handled by closing the underlaying connection.

Servers SHOULD always attempt to process partial message bodies in order to
store as much of the received data as possible.

Clients SHOULD use a randomized exponential back off strategy after
encountering a network error or receiving a `500 Internal Server Error`. It is
up to the client to decide to give up at some point.

#### OPTIONS

An `OPTIONS` request MAY be used to gather information about the current
configuration of the server. The response MUST contain the `TUS-Extension`,
`TUS-Version` and `TUS-Max-Size` if available.

##### Example

This example clarifies the response for an `OPTIONS` request. The version used
in both, request and response, is `1.0.0` while the server is also capable of
handling `0.2.2` and `0.2.1`. Uploads with a total size of up to 1GB are
supported and the extensions for file creation, upload expiration and retries
are enabled.

**Request:**

```
OPTIONS /files HTTP/1.1
Host: tus.example.org
TUS-Resumable: 1.0.0
```

**Response:**

```
HTTP/1.1 204 No Content
TUS-Resumable: 1.0.0
TUS-Version: 1.0.0,0.2.2,0.2.1
TUS-Max-Size: 1073741824
TUS-Extension: file-creation,upload-expiration,retries
```

## Protocol Extensions

Clients and servers are encouraged to implement as many of the extensions
described below as possible. Feature detection SHOULD be achieved using the
`TUS-Extension` header in the response to an `OPTIONS` request.

### File Creation

All clients and servers SHOULD implement the file creation API. In cases where
that does not make sense, a custom mechanism may be used instead.

#### Example

An empty POST request is used to create a new upload resource. The
`Entity-Length` header indicates the size of the file that will be uploaded.

**Request:**

```
POST /files HTTP/1.1
Host: tus.example.org
Content-Length: 0
Entity-Length: 100
TUS-Resumable: 1.0.0
Metadata: filename d29ybGRfZG9taW5hdGlvbl9wbGFuLnBkZg==
```

**Response:**

```
HTTP/1.1 201 Created
Location: http://tus.example.org/files/24e533e02ec3bc40c387f1a0e460e216
TUS-Resumable: 1.0.0
```

The new resource has an implicit offset of `0` allowing the client to use the
core protocol for performing the actual upload.

The client MAY supply the `Metadata` header to add additional metadata to the
file creation request. The server MAY decide to ignore or use this information
to further process the request or to reject it.

#### Headers

##### Entity-Length

The `Entity-Length` header indicates the final size of a new entity in bytes.
This way a server will implicitly know when a file has completed uploading. The
value MUST be a non-negative integer or the string `streaming` indicating that
the streams extension is used to send the entity's length later.

##### Metadata

The `Metadata` header MUST be a comma-separated list adding one or multiple
key-value-pairs to the file creation request. Its elements MUST consist of the
key and the according Base64 encoded value seperated by a space. Both entities,
the key and value, MUST be non-empty strings. The key MUST NOT contain a space
or a comma.

#### Requests

##### POST

Clients MUST use a `POST` against a well known file creation URL to request the
creation of a new file resource. The request MUST include an `Entity-Length`
header unless the streams extension is used to upload a file of unknown size.

Servers MUST acknowledge a successful file creation request with a `201
Created` response code and include an absolute URL for the created resource in
the `Location` header.

Clients then continue to perform the actual upload of the file using the core
protocol.

### Upload Expiration

The server may want to remove unfinished uploads. In order to indicate this
behavior to the client this extension SHOULD be implemented.

#### Example

The upload will be available until the time specified in `Upload-Expires`.
After this date the upload isn't available and can't be continued.

**Request:**

```
PATCH /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Type: application/offset+octet-stream
Content-Length: 30
Offset: 70
TUS-Resumable: 1.0.0

[remaining 30 bytes]
```

**Response:**

```
HTTP/1.1 204 No Content
Upload-Expires: Wed, 25 Jun 2014 16:00:00 GMT
TUS-Resumable: 1.0.0
```

#### Headers

##### Upload-Expires

The `Upload-Expires` header indicates how much time an upload has to complete
before it expires. A server MAY wish to remove incomplete uploads after a given
period to prevent abandoned uploads from taking up space. The client SHOULD
use this header to determine if an upload is still valid before attempting to
upload another chunk and otherwise begin the upload process from scratch.

This header MUST be included in the reponse to every PATCH request if the upload
is going to expire. Its value MAY change over time.

If a client does attempt to resume an upload which has since been removed by the
server, the server MUST respond with `404 Not Found` or `410 Gone`. The latter
one SHOULD be used if the server is keeping track of expired uploads. In both
cases the client MUST start a new upload.

The value of the  `Upload-Expires` header MUST be in
[RFC 2616](http://tools.ietf.org/html/rfc2616) datetime format.

### Checksums

Clients and servers MAY implement and use this extension to verify data
integrity per chunk. In this case the server MUST add the `checksum` element to
the `TUS-Extension` header.

A client MAY include the `Content-MD5` header and its appropriate value in a
`PATCH` request. The value MUST be the Base64 encoded string of the MD5 digest
of the entire chunk which is currently uploading as defined in
[RFC2616 Section 14.15 Content-MD5](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.15).
Once all the data of the current uploading chunk has been received by the server
it MUST verify the uploaded chunk against the provided checksum. If the
verification succeeds the server continues with processing the data. In the
case of mismatching checksums the server MUST abort handling the request and
MUST send the tus-specific `460 Checksum Mismatch` status code. In addition the
file and its offsets MUST not be updated.

If the hash cannot be calculated at the beginning of the upload it MAY be
included as a trailer. If the server can handle trailers, this behavior MUST be
promoted by adding the `checksum-trailer` element to the `TUS-Extension` header.
Trailers, also known as trailing headers, are headers which are sent after the
request's body has been transmitted already. Following
[RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.6.1) they
must be announced using the `Trailer` header and are only allowed in chunked
transfers.

#### Example

**Request**:

```
PATCH /files/17f44dbe1c4bace0e18ab850cf2b3a83
Content-Length: 40
Offset: 0
TUS-Resumable: 1.0.0
Content-MD5: vVgjt92XwLTGjdkIiNdlSw==

Die Würde des Menschen ist unantastbar.
```

**Response**:

```
204 No Content
TUS-Resumable: 1.0.0
```

### Streams

This extension defines how to upload finite streams of data that have an
unknown length at the beginning of the upload.

If the file creation extension is used to initiate a new upload the
`Entity-Length` header MUST be set to the string `streaming`. Once the total size of the
entire upload is known it MUST be included as the `Entity-Length` header's value
in the next `PATCH` request. Once the entity's length has been set it MUST NOT
be changed.

In order to indicate that this extension is supported by the server it MUST
include the `streams` element in the `TUS-Extension` header.

#### Example

After creating a new upload using the file creation extension, 100 bytes are
uploaded. The next request transfers additional 100 bytes and the total entity
length. In the end of this example the server knows that the resource will have
a size of 300 bytes but only the first 200 are transferred.

**Request:**

```
POST /files HTTP/1.1
Host: tus.example.org
TUS-Resumable: 1.0.0
Content-Length: 0
```

**Response:**

```
HTTP/1.1 201 Created
TUS-Resumable: 1.0.0
Location: http://tus.example.org/files/24e533e02ec3bc40c387f1a0e460e216
```

**Request:**

```
PATCH /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
TUS-Resumable: 1.0.0
Content-Type: application/offset+octet-stream
Content-Length: 100
Offset: 0

[100 bytes]
```

**Response:**

```
HTTP/1.1 204 No Content
TUS-Resumable: 1.0.0
```

**Request:**

```
PATCH /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
TUS-Resumable: 1.0.0
Content-Type: application/offset+octet-stream
Content-Length: 100
Offset: 100
Entity-Length: 300

[100 bytes]
```

**Response:**

```
HTTP/1.1 204 No Content
TUS-Resumable: 1.0.0
```

### Retries

In the case of the server not being able to accept the current request it MAY
return `503 Service Unavailable`. The client SHOULD retry the request after
waiting an appropriated duration. It MAY retry for other status codes including
`4xx` and `5xx`.

### Termination

This extensions defines a way for clients to terminate unfinished uploads which
won't be continued allowing servers to free up used resources. All clients are
encouraged to implement this.

Clients MAY terminate an upload by sending a `DELETE` request to the upload's
url.

When recieving a `DELETE` request for an existing upload the server SHOULD free
associated resources and MUST return the `204 No Content` status code,
confirming that the upload was terminated. For all future requests to this URL
the server MUST return `404 No Found` or `410 Gone`.

If this extension is supported by the server it MUST be announced by adding the
`termination` element to the `TUS-Extension` header.

#### Example 

**Request:**

```
DELETE /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.org
Content-Length: 0
TUS-Resumable: 1.0.0
```

**Response:**

```
HTTP/1.1 204 No Content
TUS-Resumable: 1.0.0
```

### Merge

This extension can be used to merge multiple uploads into a single one enabling
clients to perform parallel uploads and uploading non-contiguous chunks. If the
server supports this extension it MUST be announced by adding the `merge`
element to the values of the `TUS-Extension` header.

A partial upload is an upload which represents a chunk of a file. It is
constructed by including the `Merge: partial` header when creating a new
resource using the file creation extension. Multiple partial uploads are merged
into a final upload in a specific order. The server SHOULD NOT process these
partial uploads until they are merged to form a final upload. The length of the
final resource MUST be the sum of the length of all partial resources. A final
upload is considered finished if all of its partial uploads are finished.

In order to create a new final upload the client MUST omit the `Entity-Length`
header and add the `Merge` header to the file creation request. The headers
value is the string `final` followed by a semicolon and a space-separated list
of the URLs of the partial uploads which will be merged. The order of this list
MUST represent the order using which the partial uploads are concatenated. This
merge request MAY even happen if all or some of the corresponding partial
uploads are not finished.

The server MAY delete partial uploads once they are merged but they MAY be used
multiple times for forming a final resource.

Any `PATCH` request against a final upload MUST be denied and MUST neither
modify the final nor any of its partial resources. The response of a `HEAD`
request MUST NOT contain the `Offset` header. The `Entity-Length` header MUST be
included if the length of the final resource can be calculated at the time.
Responses to `HEAD` requests against partial or final uploads MUST include the
`Merge` header and its value as sent in the file creation request.

#### Headers

##### Merge

The `Merge` header indicates whether the upload created by the request is either
a partial or final upload. If a partial upload is to be built, the header value
MUST be `partial`. In the case of creating a final resource its value is the
string `final` followed by a semicolon and a space-separated list of the URLs of
the partial uploads which will be merged and form the file. All of the URLs MUST
NOT contain a space. The host and protocol scheme of the URLs MAY be omitted. In
this case the value of the `Host` header MUST be used as the host and the scheme
of the current request.

#### Example

In the following example the `Host` and `TUS-Resumable` headers are omitted for
readability although they are required by the specification.
In the beginning three partial uploads are created:

```
POST /files HTTP/1.1
Merge: partial
Entity-Length: 100

HTTP/1.1 204 No Content
Location: http://tus.example.org/files/a
```
```
POST /files HTTP/1.1
Merge: partial
Entity-Length: 200

HTTP/1.1 204 No Content
Location: http://tus.example.org/files/b
```
```
POST /files HTTP/1.1
Merge: partial
Entity-Length: 300

HTTP/1.1 204 No Content
Location: http://tus.example.org/files/c
```

The next step is to create the final upload. In following request no
`Entity-Length` header is presented.

```
POST /files HTTP/1.1
Merge: final; /files/a /files/b, http://tus.example.org/files/c

HTTP/1.1 204 No Content
Location: http://tus.example.org/files/abc
```

You are now able to upload data to the three partial resources using `PATCH`
requests. The length of the final resource is now 600 bytes.

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
implementation requirements for clients and servers, so we're quite happy with
them.

### Why are you not using the "X-" prefix for your headers?

The "X-" prefix for headers has been deprecated, see [RFC
6648](http://tools.ietf.org/html/rfc6648).

### How can I deal with bad http proxies?

If you are dealing with http proxies that strip/modify http headers or can't
handle `PATCH` requests properly, you should consider using https which will
make it impossible for proxies to modify your requests.

If that is not an option for you, please reach out to us, we are open to
defining a compatibility protocol extension.

### How are pause/resume handled? When should I delete partial uploads?

The tus protocol is built upon the principles of simple pausing and resuming. In
order to pause an upload you are allowed to end the current open request. The
server will store the uploaded data as long as no violations against other
constraints (e.g. checksums) or internal errors occur. Once you are ready to
resume an upload, send a `HEAD` request to the according file URL in order to
obtain the available offsets. After receiving a valid response you can upload
more data using `PATCH` requests. You should keep in mind that the server may
delete an unfinished upload if it is not continued for a longer time period (see
Upload Expires extension).

Before deleting an outstanding upload the server should give the client enough
time to resolve potential networking issues. Since this duration depends heavily
on the underlining application model, the protocol does not contain a specific
number, but we recommend a few days for a general usecase.

## License

Licensed under the MIT license, see
[LICENSE.txt](https://github.com/tus/tus-resumable-upload-protocol/blob/master/LICENSE.txt).

Copyright (c) 2013-2015 Transloadit Ltd and Contributors.
