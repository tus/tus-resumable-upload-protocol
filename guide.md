# Developer Guide

The intention of this document is to provide an introduction to tus, outline the ideas behind the protocol itself, and collect and share experiences from developing and deploying existing implementations. However, it does not replace the specification nor tries to compete with it, but serves the purpose of adding information which should not be located in the specification.

## The origin of tus

Sharing information is the fundamental idea behind the internet, regardless of the form of it. It may be textual or represented by images, video and audio or several other formats. Even though the web has existet for multiple decades, sharing this information still hasen't been solved. In particular, ensuring that files have been safely transfered to other computers, is still a complex task. And with the rise of mobile devices, the requirements have increased. Service providers need to ensure that users are able to squeeze big files through the tiny and unreliably pipes of the mobile connections.

Let's have a look at an actual example to illustrate this problematic. We assume a user has just recorded a beautiful video of some magnisicant scenery and wants to upload this file to your server, where further processing happens and he will be able to share it with the world. Usually, these video files can end up pretty big, ranging from a few megabytes up to a gigabyte. The user will start the upload, and after transfering 80% of the video to the service provider, the internet connection is lost, just for the fraction of a second as the mobile devices switches it's network protocol. Now the server owns a copy of the users' video but since it's incomplete it can now be used. In this case the file needs to be uploaded a second time and from the beginning, hoping that such a interruption of the connection does not happen.

In the last paragraph we assumed a network interruption caused the upload to be aborted. In reality, there are mutliple reasons why the connection can be lost. Another possebility is that the server receiving the files crashes due an implementation issue or request overload. In another case the server's networks is unreliable or may not be available at all. Of course, bad things can also happen at the user's side. We have to be prepared of crashing client applications or entire operation systems. As you can see, there is a wide variety of possebilities why an upload can be aborted before it's finished.

The summary of this example is that upload a big chunk of data on one single take is not guaranteed, but users want this guarantee.

And exactly this issue is tackled with our protocol. In order to solve this problem tus introduces **resumable uploads**. *Resumable* means that an upload can be interrupted at any moment and can be resumed without re-uploading the previous data again. An interruption may happen willingly, if the user wants to pause, or by accident in case of an network issue or server outage. If we recall the example from above, and the process is aborted at 80%, tus will ensure that the reupload is started at 81% and only the last remaining 20% are transmitted instead of the entire and huge video file.

## Vocabulary

While looking at the offical specification, a reader may notice the frequent use of several words or phrases which are uncommon in the daily language. This section will try to cover these cases and provide a simple and readable definition for them.

## Technical details

### Header naming conventions

The protocol does not make any assumptions about the content of responses or about the URL design at all. Instead, headers are used as the main way of communicating between the client and server. Therefore, a lot of attention has been paid at developing a proper naming convention for them.

All headers – but one exception – can be put into one of two categories:

* Headers describing the currently used **protocol implementation** are prefixed with `Tus-`, such as `Tus-Resumable`, `Tus-Version` and `Tus-Extension`. Their values are used to retrieve implementation details. For example, the server, when handling a request, verifies that the client's version, contained inside the `Tus-Resumable` header, is supported. Other common use cases are the client checking the servers maximum upload size using `Tus-Max-Size` or the implemented extensions using `Tus-Extension`.
* Headers describing properties of the currently handled **upload** use the `Upload-` prefix, e.g. `Upload-Length` and `Upload-Offset`. The most important values are the upload's length and offset, but it may also carry meta data or information about expiration or concation.

Although the `X-` prefix is commonly used for naming custom headers which are not defined in the HTTP specification, we discourage the use of this convention. The reason for this behaviour is the deprecation of the prefix according to [RFC 6648](http://tools.ietf.org/html/rfc6648).

The mentioned exception, which does not follow our prefixing convention, is `X-HTTP-Method-Override`. It can be used to overwrite a request's method and can be used in cases where an environment does not support the `PATCH` or `DELETE` methods. Originally, when adding this feature to the specification, we wanted to name it `Tus-Method-Override` but this would introduce two issues. Firstly, the header describes a property of the current request and not the client's implementation and therefore violates the constraint of the `Tus-` prefix. Secondly, the `X-HTTP-Method-Override` header is wildly adopted and has become a [de facto standard](https://en.wikipedia.org/wiki/De_facto_standard) without being defined anywhere. We didn't want to break this convention and therefore adopted this common implementation.


### Empty files

Since the length of an upload - specified using the `Upload-Length` header - is defined as a "non-negative integer", its value can also be 0. This has caused for some confusion in the community about the minimum size of a file and whether empty files are actually useful. According to the specification empty file with a length of zero are allowed and must be supported by all server-side and client-side implementations. This behavior may seem strange first since the usage of an empty upload is rare but still existent. For example, you can use it to indicate the absence of content or to trigger separate processing routines.

### HTTP/2 support

When tus development had been started, HTTP/1.1 was the dominating version but the process of standardizing HTTP/2 has already began. While the two protocols are not compatible in terms of their transfered data structures, the exposed interface mostly is. Therefore, we watched out to support both versions, HTTP/1.1 and HTTP/2. In most cases there has been no difference but minor incompatibilities are presented, e.g. the removal of custom reasons for status codes. To sum things up, tus can be used with any HTTP/1.1 or HTTP/2 compatible server and client.  

### Handling 2XX status codes

While the specification usually defines the status codes of responses in a strict way, sloppy server implementations can cause unexpected behavior on the client-side. For example, if a `PATCH` request finishes without any error, the status code `204 No Content` must be returned. The major difference between it and `200 OK` is the absence of a non-empty response body.

However, some server, if they are not correctly implemented, may send the wrong status code, e.g. 200 instead of 204. This can cause major issues for the client which expects a 204 status code and therefore may interpret the 200 as a failure. Therefore, client-side implementations should handle these cases as the same and must be prepared to accepts alternative response codes. We recommend to treat every status code in the 2XX-group as the same in order to prevent the problems from the example above.

### Method overriding

tus tries to follow a RESTful design and therefore uses different methods to express the purpose of a request. For example, `PATCH` requests are used to adding a chunk to an upload and `HEAD` ones fetch information about an upload. While this adds an immense amount of flexibility, there are still some issues with this approach. Some implementations - mostly on the client-side - restrict the number of available methods. The most important cases are some Java APIs and the Flash runtime in the browser. Neither of them support the newer `PATCH` and `DELETE` methods.

This problem is not specific to tus and a more general issue. Therefore, a solution has already emerged into a de-facto standard and introduced the `X-HTTP-Method-Override` request header. Its value should be the method name as which the request should be interpreted. Using this approach, you can send a `POST` request in conjunction with the `X-HTTP-Method-Override: PATCH` header, which will be equivalent to a normal `PATCH` request.

This solution has been adopted by tus and added to the specification to ensure compatible behavior across all server-side implementations.
