spade - JavaScript module loader

Spade is a module loader for use with [bpm](https://github.com/getbpm/bpm)
By default BPM loads all JavaScript files alphabetically. However, for
more complex projects this is undesirable. Spade adds a require method
that can be called to load and execute specific files.

## Basic Usage

In an existing BPM project:

1. Add spade as a dependency

    bpm add spade

2. Update your index.html
   When using spade, files are no longer automatically loaded, so you'll
   have to update your index.html to load your main.js. After bpm_lib.js
   is sourced add the following line:

     <script>spade.require('YOUR_APP');</script>

3. Start using `require` in your JavaScript!

## Useful Tips

Like node.js, require can return a JavaScript object. However, unlike
node.js you can define globals within your files. The ability to define
globals makes it easier to develop in a browser environment.
