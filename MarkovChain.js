const fs = require('fs');
Array.prototype.pick = function() {
    return this[Math.floor(Math.random() * this.length)];
}

Array.prototype.addIfNotExists = function(item) {
    if (!this.includes(item)) {
        this.push(item);
    }
}

var rt = "./";
var ext = ".json";

module.exports = class MarkovChain {
    constructor(options) {

        let fileName = options.fileName;
        let contentArray = options.contentArray;

        if (fileName && fs.existsSync(rt + fileName + ext)) {
            this.read(fileName);
        } else {
            this.startWords = [];
            this.endWords = [];
            this.chain = {};
            this.totalItems = 0;
            this.averageLength = 0;
        }

        if (contentArray && contentArray.length > 0) {
            this.addItemsToChain(contentArray);
        }
    }

    addItemsToChain(contentArray) {
        contentArray.forEach(function(item) {
            this.addToChain(item.split(" "));
        }, this);
        this.sortChain();
        this.averageLength = Math.ceil(this.totalItems / contentArray.length);
    }

    addToChain(array) {
        this.startWords.addIfNotExists(array[0]);
        this.endWords.addIfNotExists(array[array.length - 1]);
        this.totalItems += array.length;

        array.forEach(function(word, i) {
            if (word != '' && i < array.length - 1) {
                let nextWord = array[i + 1];
                let toInsert = {};
                toInsert[nextWord] = 1;
                if (this.chain.hasOwnProperty(word)) {
                    let words = this.chain[word].words;
                    if (words.some(el => (el.word === nextWord))) {
                        words.forEach(function(e) {
                            if (e.word == nextWord) {
                                e.count += 1;
                            }
                        });
                    } else {
                        words.push({ word: nextWord, count: 1 });
                    }
                    this.chain[word].total += 1;
                } else {
                    this.chain[word] = { words: [{ word: nextWord, count: 1 }] };
                    this.chain[word].total = 1;
                }
            }
        }, this);
    }

    sortChain() {
        for (let word in this.chain) {
            this.chain[word].words.sort(function(a, b) {
                return a.count - b.count;
            })
        }
    }

    build(options) {

        options = options || {};

        let minLength = options.hasOwnProperty('minLength') ? options.minLength : Math.ceil(this.averageLength * 0.5);
        let minWeighting = options.hasOwnProperty('minWeighting') ? options.minWeighting : 0;
        let tries = options.hasOwnProperty('tries') ? options.tries : 0;

        let word = this.startWords.pick();
        let line = [word];
        while (this.chain.hasOwnProperty(word)) {
            let link = this.chain[word];
            let runningTotal = 0;
            let minBound = link.total * minWeighting;
            let r = Math.ceil(Math.random() * (link.total - minBound) + minBound);
            for (let candidate of link.words) {
                runningTotal += candidate.count;
                if (runningTotal >= r) {
                    word = candidate.word;
                    break;
                }
            }
            line.push(word);
            if (line.length > minLength && this.endWords.includes(word)) {
                break;
            }
        }
        return line.join(" ");
    }

    read(fileName) {
        let obj = JSON.parse(fs.readFileSync(rt + fileName + ext, 'utf8'));
        this.chain = obj.chain;
        this.startWords = obj.startWords;
        this.endWords = obj.endWords;
        this.totalItems = obj.totalItems;
        this.averageLength = obj.averageLength;
    }

    write(fileName) {
        fs.writeFileSync(
            rt + fileName + ext,
            JSON.stringify({
                startWords: this.startWords,
                endWords: this.endWords,
                chain: this.chain,
                totalItems: this.totalItems,
                averageLength: this.averageLength
            }),
            'utf8');
    }
}