There is duplicate urls that visited this is probably because of this code:

```js
//i am using new URL(url).href because https://example.com/ === https://example.com should be the same.
this.#visitedPages.add(new URL(url).href);
```

Because i treat https://example.com/ and https://example.com when i add them to the `this.#visitedPages` but not when i do this:

```js
hyperlinks = this.filterHyperlinks(hyperlinks, url);
this.#jobQueue.enqueueNJobs(hyperlinks);
```

`this.filterHyperlinks` doesnt' filter these two urls.
I think there is two solutions to this first one is i need to normalize the url parameter on the first line and check if this normalized url exists in the `this.#visitedPages` and if it does i early return it and close the page. The second solution is i deduplicate these urls in the `this.filterHyperlinks` method, this is computationally more expensive.

The second problem is i need to only visit the pages with encrypted connection. This is trivial to solve. I just parse the url in the `visit` function and check for the protocol.

The third problem is i shouldn't visit only the web pages with the en-US language.
There isn't a straigtforward solution if the web server doesn't specify the language in the response headers
Maybe in the future the user can namespace the urls we can visit like https://expressjs.com/en/middlewares/*
so we can't visit https://expressjs.com/en/routing for example.

This is very interesting i crawled the expressjs.com and there was total of 1040 web pages but the queue length went up to **9000**!. I think this because i visitthe pages concurrently different pages add the same hyperlinks to the queue. I think the solution to this is the queue should maintain the visited pages not the Crawler class. I think i could remove `visitedPages` from the Crawler completely but i suspect i can run into the same problem i faced before. The queue becomes empty even though there are hyperlinks we didn't discover yet.
