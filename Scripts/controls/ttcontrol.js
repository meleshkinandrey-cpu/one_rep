define(['jquery', 'tooltipster', 'tooltipsterScroll'], function ($) {
    var module = {
        control: function () {
            var self = this;
            //
            self.defaultConfig = {
                text: '',
                maxWidth: 400,
                side: 'top',
                delay: [1500, 200],
                showImmediat: false, //сразу показываем
                showTime: 4000, //false чтоб вечно висело
                multilineText: false //если у вас текст с переносами
            };
            //
            self.init = function ($container, settings) {
                if ($container == null || $container.length <= 0)
                    return false;
                //
                var config = self.defaultConfig;
                $.extend(config, settings);
                //
                var instances = [];
                try {
                    instances = $.tooltipster.instances();
                //
                $.each(instances, function (i, instance) {
                    instance.close();
                });
				}
                catch (e) { }//stack overflow?
                //
                if (config.multilineText)
                    config.text = '<p style="white-space: pre-wrap">' + config.text + '</p>';
                //
                var instance = null;
                try {
                    var instance = $container.tooltipster('instance');
                } catch (e) { };
                //
                if (instance != null) {
                    var ttStatus = instance.status();
                    //
                    if (ttStatus.destroyed == false && ttStatus.destroying == false && ttStatus.enabled == true)
                    {
                        instance.content(config.text);
                        if (config.showImmediat)
                            instance.open();
                        return false;
                    }
                }
                //
                $container.tooltipster({
                    content: config.text,
                    contentAsHTML: true,
                    maxWidth: config.maxWidth,
                    functionReady: function (instance, helper) {
                        if (config.showTime)
                            setTimeout(function () {
                                if (instance.status().open)
                                    instance.close();
                            }, config.showTime);
                    },
                    plugins: ['sideTip', 'scrollableTip'],
                    delay: config.delay,
                    side: config.side,
                    trigger: 'custom',
                    triggerClose: { mouseleave: true, click: true, originclick: true },
                    triggerOpen: { mouseenter: !config.showImmediat },
                    theme: ['tooltipster-noir', 'tooltipster-noir-customized']
                });
                //
                if (config.showImmediat)
                    $container.tooltipster('open');
                //
                return true;
            };
            //
            self.destroy = function ($container) {
                if ($container == null || $container.length <= 0)
                    return false;
                //
                var instance = null;
                try {
                    var instance = $container.tooltipster('instance');
                } catch (e) { };
                //
                if (instance != null) {
                    var ttStatus = instance.status();
                    //
                    if (ttStatus.destroyed == false && ttStatus.destroying == false) {
                        instance.destroy();
                        return true;
                    }
                }
                //
                return false;
            };
        }
    }
    return module;
});