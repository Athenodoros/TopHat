# TopHat

TopHat is an offline-first personal finances app. It is designed to let users manage their finances across multiple currencies, in a privacy preserving way.

![Transactions View](screenshot.png)

### Why have you done this?

I wanted to track my expenses in a lightweight way, without doing something crazy like giving a 3rd party the passwords to my bank accounts. After looking around, I found that I wanted three main things:

-   Offline-First: I don't want the details of my accounts to be sold, or subject to the questionable infosec standards of a new startup. This also means a solid experience around uploading statement csvs is required, to save the manual gruntwork.
-   Multi-Currency Support: I hold money in multiple currencies, and need to be able to track them over time. This is surprisingly uncommon in the world of personal finance apps.
-   Transaction Tracking: I don't need a full YNAB-style budgeting workflow, but I do want to be able to track how much I'm spending on bills/recreation/travel over time, and see how my overall balance is changing.

I couldn't find anything which hit all three requirements, so after many weekends of work, TopHat is now what I'm using.

### What is it, technically speaking?

It's a Single Page App bootstrapped with Create-React-App, built using Typescript/React/Redux and some other common libraries (primarily [Victory Charts](https://formidable.com/open-source/victory/) and [Material-UI](https://mui.com/)). It uses a Service Worker for offline behaviour, and IndexedDB (via dexie.js) for storage.

### Should I use this?

Probably not! I expect that it will have bugs, and the goals of TopHat are fairly niche interests. That said, it's available publicly at [https://athenodoros.github.io/TopHat](https://athenodoros.github.io/TopHat), and can populate itself with notional data to let people try things out.
