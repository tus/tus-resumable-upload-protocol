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

### 
