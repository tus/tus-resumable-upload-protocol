# tus resumable upload protocol

**Version:** 0.1 ([SemVer](http://semver))

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](http://www.ietf.org/rfc/rfc2119.txt).

## Status

Interested developers are encouraged to implement prototypes of this protocol
and submit their feedback in form of comments of patches.

## Abstract

The tus resumable upload protocol describes a light-weigh mechanism for file
uploads over http that can be resumed in the event of a network failure.

Features of the protocol include:

* Uploading files via HTTP
* Resuming interrupted uploads
* Transferring parts of a file in parallel

## Protocol

This protocol is defined as subset of
[RFC 2616](http://tools.ietf.org/html/rfc2616) (HTTP 1.1) to provide a
[RESTful](http://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
mechanism for resumable file uploads.

### Uploading new files

Servers SHOULD provide one or more tus endpoints. A tus endpoint can be any URL
that clients can use to create new file resource.

All requests to a tus endpoint MUST use the `POST`, and include a
`Content-Range` and `Content-Length` header.

The `Content-Length` defines the amount of bytes to be uploaded along with the
request. For resumable uploads it SHOULD be set to `0`, but clients MAY choose
to upload some or all of the file data to a tus endpoint.

The `Content-Range` defines the total size of the file, and optionally the data
range included in the body of the request. When `Content-Length` is `0`, the
`Content-Range` 

*... this part of the document has not been updated yet ...*

### POST /files

Used to create a resumable file upload. You may send parts or all of your file
along with this request, but this is discouraged as you will not be able to
resume the request if something goes wrong.

**Request Example:**

```
POST /files HTTP/1.1
Host: tus.example.com
Content-Length: 0
Content-Range: bytes */100
Content-Type: image/jpg
Content-Disposition: attachment; filename="me.jpg"'
```
```
<empty body>
```

**Response Example:**

```
HTTP/1.1 201 Created
Location: http://tus.example.com/files/24e533e02ec3bc40c387f1a0e460e216
Content-Length: 0
Content-Type: image/jpg
Content-Disposition: attachment; filename="me.jpg"'
```

The `Location` header returns the `<fileUrl>` to use for interacting with the
file upload.

### PUT &lt;fileUrl&gt;

**Request Example:**

```
PUT /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.com
Content-Length: 100
Content-Range: bytes 0-99/100
```
```
<bytes 0-99>
```

**Response Example:**

```
HTTP/1.1 200 Ok
Content-Type: image/jpg
Content-Disposition: attachment; filename="me.jpg"'
Range: bytes=0-99
Content-Length: 0
```

### HEAD &lt;fileUrl&gt;

**Request Example:**

```
HEAD /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.com
```

**Response Example:**

```
HTTP/1.1 200 Ok
Content-Length: 100
Content-Type: image/jpg
Content-Disposition: attachment; filename="me.jpg"'
Range: bytes=0-20,40-99
```

The `Range` header holds a [byte
range](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.35.1) that
informs the client which parts of the file have been received so far. It is
up to the client to choose appropriate `PUT` requests to complete the upload.

A completed upload will be indicated by a single range covering the entire file
size (e.g. `Range: bytes=0-99` for a 100 byte file).

**Note** If the server has not received anything so far, there will be no `Range`
header present.

### GET &lt;fileUrl&gt;

Used to download an uploaded file.

**Request:**

```
GET /files/24e533e02ec3bc40c387f1a0e460e216 HTTP/1.1
Host: tus.example.com
```

**Response:**

```
HTTP/1.1 200 Ok
Content-Length: 100
Content-Type: image/jpg
Content-Disposition: attachment; filename="me.jpg"'
```
```
[file data]
```

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

Copyright (c) 2013 Transloadit Ltd and Contributors. Licensed under the MIT
license, see
[LICENSE.txt](https://github.com/tus/tus-resumable-upload-protocol/blob/master/LICENSE.txt).

## Contributing

This protocol has it's own [Github repository](https://github.com/tus/tus-resumable-upload-protocol)
where you can leave feedback and pull requests.
