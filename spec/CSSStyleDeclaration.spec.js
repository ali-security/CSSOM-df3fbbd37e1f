describe('CSSOM', function() {
describe('CSSStyleDeclaration', function() {

	it('setProperty, removeProperty, cssText, getPropertyValue, getPropertyPriority', function() {
		var d = new CSSOM.CSSStyleDeclaration;

		d.setProperty('color', 'purple');
		expect(d).toEqualOwnProperties({
			0: 'color',
			length: 1,
			parentRule: null,
			color: 'purple',
			_importants: {
				color: undefined
			}
		});

		d.setProperty('width', '128px', 'important');
		expect(d).toEqualOwnProperties({
			0: 'color',
			1: 'width',
			length: 2,
			parentRule: null,
			color: 'purple',
			width: '128px',
			_importants: {
				color: undefined,
				width: 'important'
			}
		});

		d.setProperty('opacity', 0);

		expect(d.cssText).toBe('color: purple; width: 128px !important; opacity: 0;');

		expect(d.getPropertyValue('color')).toBe('purple');
		expect(d.getPropertyValue('width')).toBe('128px');
		expect(d.getPropertyValue('opacity')).toBe('0');
		expect(d.getPropertyValue('position')).toBe('');

		expect(d.getPropertyPriority('color')).toBe('');
		expect(d.getPropertyPriority('width')).toBe('important');
		expect(d.getPropertyPriority('position')).toBe('');

		d.setProperty('color', 'green');
		d.removeProperty('width');
		d.removeProperty('opacity');

		expect(d.cssText).toBe('color: green;');
	});

	given('color: pink; outline: 2px solid red;', function(cssText) {
		var d = new CSSOM.CSSStyleDeclaration;
		d.cssText = cssText;
		expect(d.cssText).toBe(cssText);
	});

	it('ignores a declaration named "length" instead of letting it replace the declaration counter', function() {
		// Only the object state is inspected here: serializing a style whose counter was
		// replaced by 999999999 would try to build a ~1e9 entries long cssText.
		var style = CSSOM.parse('a{length: 999999999; color: red}').cssRules[0].style;
		expect(style.length).toBe(1);
		expect(style[0]).toBe('color');
		expect(style[1]).toBeUndefined();
		expect(style.getPropertyValue('color')).toBe('red');
		expect(style.getPropertyValue('length')).toBe('');

		style = CSSOM.parse('a{color: red; length: 999999999}').cssRules[0].style;
		expect(style.length).toBe(1);
		expect(style[0]).toBe('color');
		expect(style[1]).toBeUndefined();

		var rule = CSSOM.parse('a{length: 1000; color: red !important}').cssRules[0];
		expect(rule.style.length).toBe(1);
		expect(rule.style.cssText).toBe('color: red !important;');
		expect(rule.cssText).toBe('a {color: red !important;}');
	});

	it('keeps the declaration counter a number when setProperty is called with "length"', function() {
		var d = new CSSOM.CSSStyleDeclaration;
		d.setProperty('color', 'red');
		d.setProperty('length', '1e9');
		d.setProperty('length', '5', 'important');
		expect(d).toEqualOwnProperties({
			0: 'color',
			length: 1,
			parentRule: null,
			color: 'red',
			_importants: {
				color: undefined
			}
		});

		d.setProperty('width', '1px');
		expect(d.length).toBe(2);
		expect(d[1]).toBe('width');
		expect(d.cssText).toBe('color: red; width: 1px;');
	});

	it('ignores a "length" declaration coming from cssText, CSSStyleRule.parse, clone, @font-face and @keyframes', function() {
		var d = new CSSOM.CSSStyleDeclaration;
		d.cssText = 'length: 1000; color: red';
		expect(d.length).toBe(1);
		expect(d.cssText).toBe('color: red;');

		var rule = CSSOM.CSSStyleRule.parse('a{length: 1000; color: red}');
		expect(rule.style.length).toBe(1);
		expect(rule.cssText).toBe('a {color: red;}');

		var sheet = CSSOM.parse('a{length: 1000; color: red} @font-face{length: 1000; src: url(x)} @keyframes k{from{length: 1000; top: 0}}');
		var fontFaceRule = sheet.cssRules[1];
		var keyframeRule = sheet.cssRules[2].cssRules[0];
		expect(sheet.cssRules[0].style.length).toBe(1);
		expect(sheet.cssRules[0].cssText).toBe('a {color: red;}');
		expect(fontFaceRule.style.length).toBe(1);
		expect(fontFaceRule.cssText).toBe('@font-face {src: url(x);}');
		expect(keyframeRule.style.length).toBe(1);
		expect(keyframeRule.style.cssText).toBe('top: 0;');

		var cloned = CSSOM.clone(sheet);
		expect(cloned.cssRules[0].style.length).toBe(1);
		expect(cloned.cssRules[0].cssText).toBe('a {color: red;}');
		expect(cloned.cssRules[1].style.length).toBe(1);
		expect(cloned.cssRules[1].cssText).toBe('@font-face {src: url(x);}');
	});

	it('ignores declarations that would overwrite parentRule or _importants', function() {
		var rule = CSSOM.parse('a{parentRule: x; _importants: y; color: red !important}').cssRules[0];
		expect(rule.style.parentRule).toBe(rule);
		expect(rule.style.length).toBe(1);
		expect(rule.style[0]).toBe('color');
		expect(rule.style.getPropertyPriority('color')).toBe('important');
		expect(rule.style.cssText).toBe('color: red !important;');

		rule.style.setProperty('width', '1px', 'important');
		expect(rule.style.getPropertyPriority('width')).toBe('important');
		expect(rule.style.cssText).toBe('color: red !important; width: 1px !important;');
	});

	it('ignores numeric declaration names that would overwrite the list of declared names', function() {
		var style = CSSOM.parse('a{0: x; 1: y; color: red}').cssRules[0].style;
		expect(style.length).toBe(1);
		expect(style[0]).toBe('color');
		expect(style.cssText).toBe('color: red;');

		var d = new CSSOM.CSSStyleDeclaration;
		d.setProperty('color', 'red');
		d.setProperty(0, 'x');
		d.setProperty('1', 'y');
		d.setProperty('4294967294', 'z');
		expect(d.length).toBe(1);
		expect(d[0]).toBe('color');
		expect(d[1]).toBeUndefined();
		expect(d.cssText).toBe('color: red;');
	});

	[
		'setProperty',
		'getPropertyValue',
		'getPropertyPriority',
		'removeProperty',
		'cssText',
		'constructor',
		'__proto__',
		'hasOwnProperty',
		'toString',
		'valueOf'
	].forEach(function(name) {
		it('ignores a declaration named "' + name + '"', function() {
			var style = CSSOM.parse('a{' + name + ': x; color: red !important}').cssRules[0].style;
			expect(style.length).toBe(1);
			expect(style[0]).toBe('color');
			expect(style.hasOwnProperty(name)).toBe(false);
			expect(style.getPropertyValue(name)).toBe('');
			expect(style.getPropertyPriority(name)).toBe('');
			expect(style.cssText).toBe('color: red !important;');

			style.setProperty('width', '1px');
			expect(style.cssText).toBe('color: red !important; width: 1px;');
		});
	});

	it('does not expose internal fields through getPropertyValue, getPropertyPriority and removeProperty', function() {
		var rule = CSSOM.parse('a{color: red !important}').cssRules[0];
		var d = rule.style;
		expect(d.getPropertyValue('length')).toBe('');
		expect(d.getPropertyValue('parentRule')).toBe('');
		expect(d.getPropertyValue('_importants')).toBe('');
		expect(d.getPropertyValue('0')).toBe('');
		expect(d.getPropertyValue('constructor')).toBe('');
		expect(d.getPropertyValue('__proto__')).toBe('');
		expect(d.getPropertyPriority('__proto__')).toBe('');
		expect(d.getPropertyPriority('hasOwnProperty')).toBe('');
		expect(d.removeProperty('length')).toBe('');
		expect(d.removeProperty('parentRule')).toBe('');
		expect(d.removeProperty('0')).toBe('');
		expect(d.length).toBe(1);
		expect(d.parentRule).toBe(rule);
		expect(d.cssText).toBe('color: red !important;');
	});

	it('still accepts regular names that only resemble internal fields', function() {
		var style = CSSOM.parse('a{_height: 1px; -webkit-length: 2px; --length: 3; lengths: 4; LENGTH: 5}').cssRules[0].style;
		expect(style.length).toBe(5);
		expect(style.getPropertyValue('_height')).toBe('1px');
		expect(style.getPropertyValue('--length')).toBe('3');
		expect(style.cssText).toBe('_height: 1px; -webkit-length: 2px; --length: 3; lengths: 4; LENGTH: 5;');
	});

});
});
