# tus resumable upload protocol

**Status:** Work in progress

Part of the tus mission is to create a simple protocol for http file uploads
that supports the following features:

* Resumable file uploads
* Multiple upload connections per file
* File meta data
* Cross domain uploads
* Legacy clients / multipart uploads

Ideally this will be accomplished in the spirit of REST while avoiding the
custom headers and http status codes used by other protocols.

**Prior art:**

* [YouTube Data API - Resumable Upload](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
* [Google Drive - Upload Files](https://developers.google.com/drive/manage-uploads)
* [Resumable Media Uploads in the Google Data Protocol](https://developers.google.com/gdata/docs/resumable_upload) (deprecated)
* [ResumableHttpRequestsProposal from Gears](http://code.google.com/p/gears/wiki/ResumableHttpRequestsProposal) (deprecated)

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

## Todo

* Custom meta data
* Multipart uploads
