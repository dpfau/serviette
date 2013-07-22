// serviette.js: a javascript library for processing .bib files
// (note, I actually know nothing about good design patterns for javascript libraries, but this is so simple that this should be fine)
var serviette = {
    tex2json : function (bibtex) {
        // Parse a BibTeX file into an array of strings in JSON format
        // Note that this is written assuming WHITESPACE MATTERS. Using the formatting output by bibdesk.
        // To do  - properly implement BibTeX capitalization convention (all to lower unless inside {})
        bibtex = bibtex.replace(/\\ /g," ").split("\n");
        bibjson = [];
        inItem = false; // one state in our parser, tracking whether we are at the start of a new item or not
        for (i=0; i<bibtex.length; i++) {
            line = $.trim(bibtex[i]);
              if (line.length != 0 && line.slice(0,2) != "%%") { // skip comments and empty lines
                if (inItem) { // continue filling out one record
                    splitline = line.slice(0,line.length-1).split(" = ");
                    if (splitline.length != 2) throw "BibTeX parse error. Wrong number of \" = \" in \"" + line + "\"";
                    if (splitline[1][0] != "{" || splitline[1][splitline[1].length-1] != "}") {
                        throw "BibTeX parse error. \"" + splitline[1] + "\" not enclosed in brackets.";
                    }
                    if (splitline[0] == "Author") {
                        authors = splitline[1].slice(1,splitline[1].length-1).split(" and ");
                        jsonlines = jsonlines.concat(",\n\t\"author\": [\n" );
                        for(j=0; j<authors.length; j++) {
                            author = authors[j].split(", ");
                            jsonlines = jsonlines.concat("\t\t{\n\t\t\t\"name\": {\n\t\t\t\t\"last\": \"" + author[0] + "\"");
                            if (author.length > 1) jsonlines = jsonlines.concat(",\n\t\t\t\t\"first\": \"" + author[1] + "\"");
                            jsonlines = jsonlines.concat("\n\t\t\t}\n\t\t}");
                            if (j<authors.length-1) jsonlines = jsonlines.concat(",");
                            jsonlines = jsonlines.concat("\n");
                        }
                        jsonlines = jsonlines.concat("\t]")
                    } else {
                        jsonlines = jsonlines.concat(",\n\t\"" + splitline[0].toLowerCase().replace(/-/g,"_") + "\": \"" + splitline[1].slice(1,splitline[1].length-1) + "\"");
                    }
                    if (line[line.length-1] == "}") {
                        inItem = false;
                        jsonlines = jsonlines.concat("\n}");
                        bibjson.push(jsonlines);
                    } else if (line[line.length-1] != ",") {
                        throw "BibTeX parse error. Neither comma nor close bracket at end of \"" + line + "\"";
                    }
                } else if (line[0] == "@") { // start a new record
                    inItem = true;
                    jsonlines = ["{\n"];
                    if (line[line.length-1] == ",") {
                        splitline = line.slice(1,line.length-1).split("{");
                        if (splitline.length != 2) throw "BibTeX parse error. Wrong number of open brackets in \"" + line + "\"";
                        jsonlines = "{\n\t\"type\": \"" + splitline[0] + "\",\n\t\"citekey\": \"" + splitline[1] + "\"";
                    } else {
                        throw "BibTeX parse error. Missing comma at end of \"" + line + "\"";
                    }
                } else {
                    throw "BibTeX parse error. Missing @ at beginning of \"" + line + "\"";
                }
            }
        }
        if (inItem) throw "BibTeX parse error. File ends without closing records.";
        return bibjson;
    },
    tex2literal : function(bibtex) {
        // Parse a bibtex file directly into an array of javascript object literals
        // Note that this is written assuming WHITESPACE MATTERS. Using the formatting output by bibdesk.
        // To do  - properly implement BibTeX capitalization convention (all to lower unless inside {})
        bibtex = bibtex.replace(/\\ /g," ").split("\n");
        literalArray = [];
        inItem = false; // one state in our parser, tracking whether we are at the start of a new item or not
        for (i=0; i<bibtex.length; i++) {
            line = $.trim(bibtex[i]);
              if (line.length != 0 && line.slice(0,2) != "%%") { // skip comments and empty lines
                if (inItem) { // continue filling out one record
                    splitline = line.slice(0,line.length-1).split(" = ");
                    if (splitline.length != 2) throw "BibTeX parse error. Wrong number of \" = \" in \"" + line + "\"";
                    if (splitline[1][0] != "{" || splitline[1][splitline[1].length-1] != "}") {
                        throw "BibTeX parse error. \"" + splitline[1] + "\" not enclosed in brackets.";
                    }
                    if (splitline[0] == "Author") {
                        authors = splitline[1].slice(1,splitline[1].length-1).split(" and ");
                        bibliteral.author = [];
                        for(j=0; j<authors.length; j++) {
                            author = authors[j].split(", ");
                            bibliteral.author.push({
                                name: {
                                    last: author[0]
                                }
                            });
                            if (author.length > 1) bibliteral.author[j].name.first = author[1];
                        }
                    } else {
                        bibliteral[splitline[0].toLowerCase().replace(/-/g,"_")] = splitline[1].slice(1,splitline[1].length-1);
                    }
                    if (line[line.length-1] == "}") {
                        inItem = false;
                        literalArray.push(bibliteral);
                    } else if (line[line.length-1] != ",") {
                        throw "BibTeX parse error. Neither comma nor close bracket at end of \"" + line + "\"";
                    }
                } else if (line[0] == "@") { // start a new record
                    inItem = true;
                    bibliteral = {};
                    if (line[line.length-1] == ",") {
                        splitline = line.slice(1,line.length-1).split("{");
                        if (splitline.length != 2) throw "BibTeX parse error. Wrong number of open brackets in \"" + line + "\"";
                        bibliteral.type = splitline[0];
                        bibliteral.citekey = splitline[1];
                    } else {
                        throw "BibTeX parse error. Missing comma at end of \"" + line + "\"";
                    }
                } else {
                    throw "BibTeX parse error. Missing @ at beginning of \"" + line + "\"";
                }
            }
        }
        if (inItem) throw "BibTeX parse error. File ends without closing records.";
        return literalArray
    },

    // converts a reference list from a BibJSON format (output of bib2json Parser) to literal array
    json2literal : function(bibjson) {

        // store bib entries in a literal array
        literalArray = [];

        // loop over individual entries
        for (i=0; i < bibjson.length; i++) {

            /*
             * Each element of bibjson has the following keys:
             *  EntryKey (the Bibtex cite-key)
             *  EntryType (the citation type)
             *  Fields (an object containing information about the citation)
            */

            // convert keys to lower case (case can vary between .bib files)
            var keys = Object.keys(bibjson[i].Fields);
            var n = keys.length;
            var bibFields = {}
            while (n--) {
                key = keys[n];
                bibFields[key.toLowerCase()] = bibjson[i].Fields[key];
            }

            // generate the literal object
            // TODO: error checks if certain fields are missing!!
            bibliteral = {
                index: i,
                type: bibjson[i].EntryType,
                citekey: bibjson[i].EntryKey,
                date_added: bibFields['Date-Added'],
                date_modified: bibFields['Date-Modified'],
                title: bibFields.title,
                author: bibFields.author.split('and'),
                publisher: bibFields.journal,
                year: bibFields.year
            };

            // push this entry to the array
            literalArray.push(bibliteral);

        }
        return literalArray
    }
};
