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

The protocol provides a mechanism for resumable file uploads via HTTP 1.1 ([RFC
2616](http://tools.ietf.org/html/rfc2616)).

## Notation

Characters enclosed by square brackets indicate a placeholder (e.g. `[size]`).

## Core Protocol

The core protocol describes how to resume an interrupted upload. It assumes that
you already have a URL for the upload, usually created via the
[Creation](#creation) extension.

All Clients and Servers MUST implement the core protocol.

This specification does not describe the structure of URLs, as that is left for
the specific implementation to decide.  All URLs shown in this document are
meant for example purposes only. The URLS MAY be absolute or relative.

In addition, the implementation of authentication and authorization is left for
the Server to decide.

### Example

A HEAD request is used to determine the offset at which the upload should be
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

Given the offset, the Client uses the PATCH method to resume the upload:


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

The `Upload-Offset` header is a request and response header that indicates a byte
offset within a resource. The value MUST be a non-negative integer.

#### Upload-Length

The `Upload-Length` header indicates the final size of the an upload in bytes.
The value MUST be a non-negative integer.


#### Tus-Resumable

The `Tus-Resumable` header MUST be sent in every response and request except
`OPTIONS` request. Its value MUST be set to the current version of the protocol
used by the Client or the Server.

If the Client requests the use of a version which is not supported by the Server
latter one MUST return `412 Precondition Failed` without processing the request
further.

#### Tus-Extension

This header MUST be a comma-separated list of the extensions supported by the
Server. If no extensions are supported `Tus-Extension` MAY be omitted.

#### Tus-Max-Size

The `Tus-Max-Size` header MUST be a non-negative integer indicating the maximum
allowed size of a single fully uploaded file in bytes. If no hard-limit is
presented or the Server is not able to calculate it this header MUST be omitted.

#### Tus-Version

This header MUST be a comma-separated list of the supported versions of the tus
resumable upload protocol by the Server. The versions MUST be sorted by Server's 
preference where the first one is the most preferred one.

### Requests

#### HEAD

Servers MUST always return an `Upload-Offset` header for `HEAD` requests against a tus
resource, even if it is `0`, or the upload is already considered completed.
If the size of the upload is known the Server MUST include the `Upload-Length` header
in the response.
If the tus resource is not found Servers SHOULD return either `404 Not Found`,
`410 Gone` or `403 Forbidden` without an `Upload-Offset` header.

#### PATCH

Servers MUST accept `PATCH` requests against any unfinished upload and apply the
bytes contained in the message at the given `Upload-Offset`. All `PATCH` requests
MUST use `Content-Type: application/offset+octet-stream`.

The `Upload-Offset` value MUST be equal to the current offset of the resource. In order
to achieve parallel upload the [Concatenation](#concatenation) extension MAY be
used. If the offsets do not match the Server MUST respond with the `409 Conflict`
status code without modifying the upload resource.

Clients SHOULD send all remaining bytes of a resource in a single `PATCH`
request, but MAY also use multiple small requests for scenarios where this is
desirable (e.g. NGINX buffering requests before they reach their backend).

Servers MUST acknowledge successful PATCH operations using a `204 No Content`
or `200 OK` status code and MUST include the `Upload-Offset` header containing
the new offset. The new offset MUST be the sum of the offset before the `PATCH`
request and the number of bytes received and processed or stored during the
current `PATCH` request.

Both, Client and Server, SHOULD attempt to detect and handle network errors
predictably. They MAY do so by checking for read/write socket errors, as well
as setting read/write timeouts. A timeout SHOULD be handled by closing the underlying connection.

Servers SHOULD always attempt to process partial message bodies in order to
store as much of the received data as possible.

#### OPTIONS

An `OPTIONS` request MAY be used to gather information about the current
configuration of the Server. A 200 response MUST contain the `Tus-Extension`,
`Tus-Version` and `Tus-Max-Size` if available.

The Server MUST NOT validate the `Tus-Resumable` header sent in the request.

##### Example

This example clarifies the response for an `OPTIONS` request. The version used
in both, request and response, is `1.0.0` while the Server is also capable of
handling `0.2.2` and `0.2.1`. Uploads with a total size of up to 1GB are
supported and the extensions for [Creation](#creation) and
[Expiration](#expiration) are enabled.

**Request:**

```
OPTIONS /files HTTP/1.1
Host: tus.example.org
Tus-Resumable: 1.0.0
```

**Response:**

```
HTTP/1.1 200 OK
Tus-Resumable: 1.0.0
Tus-Version: 1.0.0,0.2.2,0.2.1
Tus-Max-Size: 1073741824
Tus-Extension: creation,expiration
```

## Protocol Extensions

Clients and Servers are encouraged to implement as many of the extensions
described below as possible. Feature detection SHOULD be achieved using the
`Tus-Extension` header in the response to an `OPTIONS` request.

### Creation

All Clients and Servers SHOULD implement the upload creation extension. If
the Server supports this extension, it MUST include the `creation`
element in the `Tus-Extension` header.

#### Example

An empty POST request is used to create a new upload resource. The
`Upload-Length` header indicates the size of the file that will be uploaded.

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

The `Upload-Defer-Length` header indicates that the size of the upload is not known
currently and will be transferred later. Its value MUST be `1`. If an upload is not
deferred this header MUST be omitted.

##### Upload-Metadata

The `Upload-Metadata` header MUST consist of one or more key-value pairs. The
key-value pairs MUST be separated by comma. The key and value MUST be separated
by a space and MUST NOT be empty. The key MUST NOT contain a space or a comma. The
key SHOULD be ASCII encoded and the value MUST be Base64 encoded.

#### Requests

##### POST

Clients MUST use a `POST` against a well known upload creation URL to request the
creation of a new upload resource. The request MUST include an `Upload-Length`
header or `Upload-Defer-Length` header.

If the entire size of the upload is known in advance, the Client MUST include the
`Upload-Length` header and set its value to the entire size if the upload in bytes.
In the case that the entire size is not known before the upload is created, the
Client MUST NOT include the `Upload-Length` header and instead add
`Upload-Defer-Length: 1` to the `POST` request. Once the entire size of the upload
is known the Client MUST include the `Upload-Length` in the next `PATCH` request.
Once the upload's length has been set it MUST NOT be changed.

As long as the Server is not aware of the upload's length it MUST include
`Upload-Defer-Length: 1` into and MUST exclude `Upload-Length` from responses to
`HEAD` requests.

If the Server supports deferring length, it MUST add `creation-defer-length` to
the `Tus-Extension` header. 

The Client MAY supply the `Upload-Metadata` header to add additional metadata to the
upload creation request. The Server MAY decide to ignore or use this information
to further process the request or to reject it.

If the size of the upload exceeds the maximum which MAY be indicated using the
`Tus-Max-Size` headers, the Server MUST respond with the
`413 Request Entity Too Large` status code. 

If an upload contains additional metadata responses to `HEAD` requests against
these uploads MUST include the `Upload-Metadata` header and its value as sent in the
upload creation request.

The Server MUST acknowledge a successful upload creation request with a `201
Created` response code and include a URL for the created resource in
the `Location` header.

The Client then continues to perform the actual upload of the file using the core
protocol.

### Expiration

The Server MAY remove unfinished uploads. In order to indicate this behavior
to the Client, the Server MUST include the `expiration` element
in the `Tus-Extension` header.

#### Example

The upload will be available until the time specified in `Upload-Expires`.
After this date the upload isn't available and can't be continued.

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

The `Upload-Expires` header indicates how much time an upload has to complete
before it expires. A Server MAY wish to remove incomplete uploads after a given
period to prevent abandoned uploads from taking up space. The Client SHOULD
use this header to determine if an upload is still valid before attempting to
upload another chunk and otherwise start a new upload.

This header MUST be included in the response to every `PATCH` request if the
upload is going to expire. If the upload is constructed using the
[Creation](#creation) extension and the expiration date and time are
known during the construction, the `Upload-Expires` header MUST be included in
the response to the initial `POST` request. Its value MAY change over time.

If a Client does attempt to resume an upload which has since been removed by the
Server, the server SHOULD respond with `404 Not Found` or `410 Gone`. The latter
one SHOULD be used if the Server is keeping track of expired uploads. In both
cases the Client MUST start a new upload.

The value of the `Upload-Expires` header MUST be in
[RFC 2616](http://tools.ietf.org/html/rfc2616) datetime format.

### Checksum

Clients and Servers MAY implement and use this extension to verify data
integrity per chunk. In this case the Server MUST add the `checksum` element to
the `Tus-Extension` header.

A Client MAY include the `Content-MD5` header and its appropriate value in a
`PATCH` request. The value MUST be the Base64 encoded string of the MD5 digest
of the entire chunk which is currently uploading as defined in
[RFC2616 Section 14.15 Content-MD5](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.15).
Once all the data of the current uploading chunk has been received by the Server
it MUST verify the uploaded chunk against the provided checksum. If the
verification succeeds the Server continues processing the data. In the
case of mismatching checksums the Server MUST abort handling the request and
MUST respond with the tus-specific `460 Checksum Mismatch` status code. In
addition the file and its offsets MUST not be updated.

If the hash cannot be calculated at the beginning of the upload it MAY be
included as a trailer. If the Server can handle trailers, this behavior MUST be
promoted by adding the `checksum-trailer` element to the `Tus-Extension` header.
Trailers, also known as trailing headers, are headers which are sent after the
request's body has been transmitted already. Following
[RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.6.1) they
must be announced using the `Trailer` header and are only allowed in chunked
transfers.

#### Example

**Request**:

```
PATCH /files/17f44dbe1c4bace0e18ab850cf2b3a83 HTTP/1.1
Content-Length: 40
Upload-Offset: 0
Tus-Resumable: 1.0.0
Content-MD5: vVgjt92XwLTGjdkIiNdlSw==

Die Würde des Menschen ist unantastbar.
```

**Response**:

```
HTTP/1.1 204 No Content
Tus-Resumable: 1.0.0
```

### Termination

This extension defines a way for Clients to terminate completed and unfinished
uploads which won't be continued allowing Servers to free up used resources.

If this extension is supported by the Server it MUST be announced by adding the
`termination` element to the `Tus-Extension` header.

#### Requests

##### DELETE

When receiving a `DELETE` request for an existing upload the Server SHOULD free
associated resources and MUST return the 2xx response confirming that the upload
was terminated. For all future requests to this URL the Server SHOULD respond with
the `404 Not Found` or `410 Gone` status code.

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
Clients to perform parallel uploads and uploading non-contiguous chunks. If the
Server supports this extension it MUST be announced by adding the `concatenation`
element to the `Tus-Extension` header.

A partial upload is an upload which represents a chunk of a file. It is
constructed by including the `Upload-Concat: partial` header when creating a new
resource using the [Creation](#creation) extension. Multiple partial uploads are concatenated
into a final upload in a specific order. The Server SHOULD NOT process these
partial uploads until they are concatenated to form a final upload. The length of the
final resource MUST be the sum of the length of all partial resources. A final
upload is considered finished if all of its partial uploads are finished.

In order to create a new final upload the Client MUST omit the `Upload-Length`
header and add the `Upload-Concat` header to the upload creation request. The header's
value is the string `final` followed by a semicolon and a space-separated list
of the URLs of the partial uploads which will be concatenated. The order of this list
MUST represent the order by which the partial uploads are concatenated
without adding, modifying or removing any bytes. This concatenation request SHOULD
happen if all of the corresponding partial uploads are finished.

When creating a new final upload the partial uploads' metadata SHALL
not be transferred to the new final upload. Instead, all metadata SHOULD be included
in the concatenation request using the `Upload-Metadata` header.

The concatenation request MAY even be sent before all partial uploads are finished. This
feature MUST be explicitly announced by the Server by including the
`concatenation-unfinished` element in the `Tus-Extension` header.

The Server MAY delete partial uploads once they are concatenated but they MAY be
used multiple times to form a final resource.

Any `PATCH` request against a final upload MUST be denied responding with the
`403 Forbidden` status code and MUST neither modify the final nor any of its partial
resources.

The response of a `HEAD` request MUST NOT contain the `Upload-Offset` header unless
the concatenation has been successfully finished. In this case, the value of the
`Upload-Offset` MUST be the length of the final upload indicating to the Client that
the Server completed the concatenation.
The `Upload-Length` header MUST be included if the length of the final resource can
be calculated at the time. Responses to `HEAD` requests against partial or final
uploads MUST include the `Upload-Concat` header and its value as sent in the upload creation request.

#### Headers

##### Upload-Concat

The `Upload-Concat` header indicates whether the upload created by the request is either
a partial or final upload. If a partial upload is constructed, the header value
MUST be `partial`. In the case of creating a final resource its value is the
string `final` followed by a semicolon and a space-separated list of the URLs of
the partial uploads which will be concatenated and form the file.

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
Upload-Concat: final; /files/a https://tus.example.org/files/b

HTTP/1.1 201 Created
Location: https://tus.example.org/files/ab
```

The length of the final resource is now 11 bytes consisting of the string
`hello world`.

```
HEAD /files/ab HTTP/1.1

HTTP/1.1 200 OK
Upload-Length: 11
Upload-Concat: final; /files/a /files/b
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
implementation requirements for Clients and Servers, so we're quite happy with
them.

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
