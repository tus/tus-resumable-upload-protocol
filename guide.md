# Developer Guide

This document is meant to provide a more general description of what tus is and how it can be used in the best way. This guide does not replace the [protocol specification](/protocols/resumable-upload.html) but instead complements it. While the specification tells you exactly what you can and must not do, this document is intented to give you a better understanding of how the protocol works and how you might use it in your application. It's similar to how laws and regulations get interpreted to know what they actually say. Anyways, let's get started!

> This document is still a Word In Progress and is written as we speak. If you have any questios or topics you would like to see covered, [let us know](/about.html)! 

## What is tus?

tus is a project aiming to make resumable file uploads easily usable and widely available. The most interesting parts of this project is the [protocol specification](/protocols/resumable-upload.html) and the many freely available [client and server implementations](/implementations.html).

When we say "resumable file uploads", we refer to the ability that uploads can be interupted at any time and afterwards be resumed from the state where the failure began. This interruption can be accidentially (e.g. a connection drop or a server crash) or voluntarily if the user decides to pause the upload. In traditional uploading implementations your progress would be lost in such situation but tus enables you to recover from these interruptions and continues were the upload was stopped.

On a more technical side, the tus protocol is built upon HTTP/HTTPS to make it available on every platform including browsers, desktop software and mobile application. Furthermore, it also allows us to build upon the massive network of software and best practices that HTTP provides.

## When should I use tus?

If you are unsure if tus is a good fit for your use case, here is a list of criteria. If one of these points applies to you, it is very likely that you could benefit from tus:

- You operate on partly unreliable networks where connection can get easily dropped or a connection may not be available at all for some time, e.g. when using mobile data
- You handle large files and want to avoid having to reupload parts of it just because the upload got interrupted (Note: "large" is relative word. A 10MB file can large if you have an uplink speed of 100KB/s)
- You want to provide your users with the ability to pause an upload and resume it later (maybe even after a few days)
- You do not want to rely on proprietary upload solution but instead want to base your work on free and open source projects

Having that said, there are also a few situations where you might not want to use tus. This is mainly in scenarios when you handle many very small files (e.g. a few KBs) on a slow network and were the overhead of additional HTTP requests would significantly impact the performance. If you want us to assist you in your decision-making, [contact us](/about.html) and we are happy to assist you

## How does tus work?

TODO: flow of requests for upload: POST, PATCH, HEAD, repeat
