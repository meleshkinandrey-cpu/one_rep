define(['jquery', 'knockout', 'ttControl'], function ($, ko, tcLib) {
    var self = this;
    var ttcontrol = new tcLib.control();
    //
    self.getFunc = function (element, valueAccessor, allBindings) {
        var retval = {};
        retval.$container = $(element);
        retval.$childrenArray = retval.$container.children();
        retval.$target = retval.$container;
        retval.side = 'top';
        retval.multilineText = false;
        retval.showTime = undefined;
        retval.showImmediately = false;
        retval.loadingFunc = null;
        //
        var temp = allBindings.get('tooltipTarget');
        if (temp && temp != undefined) {
            var $temp = retval.$container.find('' + temp);
            if ($temp.length > 0)
                retval.$target = $temp.first();
        }
        //
        temp = allBindings.get('tooltipSide');
        if (temp && temp != undefined)
            retval.side = temp;
        //
        temp = allBindings.get('tooltipMultiline');
        if (temp && temp != undefined)
            retval.multilineText = temp;
        //
        temp = allBindings.get('tooltipHide');
        if (temp != null && temp != undefined)
            retval.showTime = temp;
        //
        temp = allBindings.get('tooltipLoadingFunc');
        if (temp != null && temp != undefined)
            retval.loadingFunc = temp;
        //
        temp = allBindings.get('tooltipShowImmediately');
        if (temp != null && temp != undefined)
            retval.showImmediately = temp;
        //
        return retval;
    };
    //
    self.bindOnMouseEnter_longName = function (element, valueAccessor, allBindings, $variables) {
        var totalWidth = 0;
        ko.utils.arrayForEach($variables.$childrenArray, function (el) {
            totalWidth += $(el).outerWidth(true);
        });
        //
        var text = ko.unwrap(valueAccessor());
        var containerWith = $variables.$container.width();
        if ((totalWidth > containerWith ||
            ($variables.$container[0].tagName == 'INPUT' && $variables.$container[0].currentStyle && self.checkerLongNameForInputIEonly($variables.$container[0].value, containerWith, $variables.$container[0].currentStyle)) ||
            ($variables.$container[0].tagName == 'INPUT' && window.navigator.userAgent.indexOf("Edge") > -1) ||
            $variables.$container[0].scrollWidth > $variables.$container[0].offsetWidth) &&
            (text && text.length > 0) && $variables.$target.attr('tooltipDisabled') != 'true')
                ttcontrol.init($variables.$target, { text: text, side: $variables.side, showImmediat: true, showTime: false });
    };
    //
    self.checkerLongNameForInputIEonly = function (innerText, inputWidth, styleList) {
        var fakeDiv = $('.longTooltipFakeDiv');
        if (fakeDiv.length == 0)
            return false;
        //
        fakeDiv.attr('style', '');
        fakeDiv.empty();
        fakeDiv.parent().show();
        //
        if (styleList) 
            for(var i in styleList)
                fakeDiv[0].style[i] = styleList[i];
        //
        fakeDiv.width(inputWidth);
        fakeDiv[0].innerHTML = innerText;
        //
        if (fakeDiv[0].scrollWidth > fakeDiv[0].offsetWidth) {
            fakeDiv.parent().hide();
            return true;
        }
        //
        fakeDiv.parent().hide();
        return false;
    };
    //
    self.bindOnMouseEnter = function (element, valueAccessor, allBindings, $variables) {
        var text = ko.unwrap(valueAccessor());
        if (text.length > 0 && $variables.$target.attr('tooltipDisabled') != 'true') {
            var firstTime = ttcontrol.init($variables.$target, { text: text, side: $variables.side, multilineText: $variables.multilineText, showTime: $variables.showTime, showImmediat: $variables.showImmediately });
            if ($variables.EventArgs && firstTime == true)
                try {
                    $variables.$container.trigger('mouseenter', $variables.EventArgs);//without this, toolTip delay not tick
                }
                catch (e) { }//stack overflow?
        }
        else
            ttcontrol.destroy($variables.$target);
    };
    self.bindOnMouseEnter_lazyLoad = function (element, valueAccessor, allBindings, $variables) {
        var loadD = $.Deferred();
        var text = ko.unwrap(valueAccessor());
        //
        if (text == '' || text == null || text == undefined) {
            $.when($variables.loadingFunc()).done(function (result) {
                text = result;
                valueAccessor()(result);
                loadD.resolve();
                //console.log('loaded from serv');
            });
        }
        else {
            loadD.resolve();
            //console.log('loaded from client, text: ' + text);
        }
        //
        $.when(loadD).done(function () { 
            if (text.length > 0 && $variables.$target.attr('tooltipDisabled') != 'true') {
                var firstTime = ttcontrol.init($variables.$target, { text: text, side: $variables.side, multilineText: $variables.multilineText, showTime: $variables.showTime, showImmediat: $variables.showImmediately});
                if ($variables.EventArgs && firstTime == true)
                    $variables.$container.trigger('mouseenter', $variables.EventArgs);//without this, toolTip delay not tick
            }
        });
    };
    //
    ko.bindingHandlers.longNameTooltip = {
        init: function (element, valueAccessor, allBindings) {
            var $vars = self.getFunc(element, valueAccessor, allBindings);
            //
            $vars.$container.css('text-overflow', 'ellipsis');
            $vars.$container.css('white-space', 'nowrap');
            $vars.$container.css('overflow', 'hidden');
            //
            $vars.$container.mouseenter(function () {
                self.bindOnMouseEnter_longName(element, valueAccessor, allBindings, $vars);
            });
        },
        update: function (element, valueAccessor, allBindings) {
            var $vars = self.getFunc(element, valueAccessor, allBindings);
            //
            ttcontrol.destroy($vars.$target);
            $vars.$container.unbind('mouseenter');
            //
            $vars.$container.mouseenter(function () {
                self.bindOnMouseEnter_longName(element, valueAccessor, allBindings, $vars);
            });
        }
    };
    ko.bindingHandlers.tooltip = {
        init: function (element, valueAccessor, allBindings) {
            var $vars = self.getFunc(element, valueAccessor, allBindings);
            //
            $vars.$container.mouseenter(function (e) {
                $vars.EventArgs = e;
                self.bindOnMouseEnter(element, valueAccessor, allBindings, $vars);
            });
            $vars.$container.click(function (e) {
                ttcontrol.destroy($vars.$target);               
            });
        },
        update: function (element, valueAccessor, allBindings) {
            var $vars = self.getFunc(element, valueAccessor, allBindings);
            //
            ttcontrol.destroy($vars.$target);
            $vars.$container.unbind('mouseenter');
            //
            $vars.$container.mouseenter(function (e) {
                $vars.EventArgs = e;
                self.bindOnMouseEnter(element, valueAccessor, allBindings, $vars);
            });
        }
    };
    ko.bindingHandlers.lazyLoadTooltip = {
        init: function (element, valueAccessor, allBindings) {
            var $vars = self.getFunc(element, valueAccessor, allBindings);
            //
            $vars.$container.mouseenter(function (e) {
                $vars.EventArgs = e;
                self.bindOnMouseEnter_lazyLoad(element, valueAccessor, allBindings, $vars);
            });
        },
        update: function (element, valueAccessor, allBindings) {
            var $vars = self.getFunc(element, valueAccessor, allBindings);
            //
            ttcontrol.destroy($vars.$target);
            $vars.$container.unbind('mouseenter');
            //
            $vars.$container.mouseenter(function (e) {
                $vars.EventArgs = e;
                self.bindOnMouseEnter_lazyLoad(element, valueAccessor, allBindings, $vars);
            });
        }
    };
});