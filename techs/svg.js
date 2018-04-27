'use strict';

const path = require('path');
const asyncFs = require('enb/lib/fs/async-fs');
const cheerio = require('cheerio');

const document = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg"><defs/></svg>`;

module.exports = require('enb/lib/build-flow').create()
	.name('svg')
	.target('target', '?.svg')
	.dependOn('bemdecl', '?.bemdecl.js')
	.useFileList('svg')
	.builder(function (files) {
		let node = this.node;
		let targetName = node.getTargetName();

		let $ = cheerio.load(document, {xmlMode: true});
		let $resultSvg = $('svg');
		let $resultDefs = $('defs');
		let resultNS = {};

		return Promise.all(files.map((file) => {
			let name = path.basename(file.fullname, '.svg');

			return asyncFs.read(file.fullname).then(content => {
				let $svg = cheerio.load(content, {xmlMode: true})('svg');

				if (!$svg.length) {
					throw new Error(`Not found svg element in ${file}.`);
				}

				let attrs = $svg.attr();
				let $defs = $svg.find('defs');
				let defs;

				let $symbol = $('<symbol/>');
				$symbol.attr('id', name);

				Object.keys(attrs).reduce((dict, key) => {
					if (/xmlns:.+/.test(key)) {
						dict[key] = attrs[key];
					}
					return dict;
				}, resultNS);

				if (attrs.viewBox) {
					$symbol.attr('viewBox', attrs.viewBox);
				}

				if ($defs.length) {
					defs = $defs.contents();
					$defs.remove();
				}

				$symbol.append($svg.contents());

				return {
					$symbol: $symbol,
					defs: defs
				}
			});
		})).then(items => {
			$resultDefs.append(
				items
					.map(item => item.defs)
					.filter(s => !!s)
					.join('\n')
			);

			if (!$resultDefs.contents().length) {
				$resultDefs.remove();
			}

			$resultSvg.append(
				['']
					.concat(
						items
							.map(item => item.$symbol)
							.filter(s => !!s)
					)
					.concat([''])
					.join('\n')

			);

			Object.keys(resultNS).forEach(key => {
				$resultSvg.attr(key, resultNS[key])
			});

			return $.xml();
		})
	})
	.createTech();
