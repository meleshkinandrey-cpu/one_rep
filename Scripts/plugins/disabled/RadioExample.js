define(['jquery'], function ($) {
    return {
        init: function () {
            if (window.location.href.toLowerCase().indexOf('authenticate') != -1)
                return;
            //
            //example: radio from lovi.fm service
            $(document.body).append('<iframe style="border:1px solid #009CFF;overflow:hidden;border-radius:5px;-webkit-border-radius:5px;-moz-border-radius: 5px;position:absolute;top:0;right:580px;width:200px;height:120px" frameborder="0" scrolling="no" src="http://lovi.fm/mini/?c=3&a=1&r=1&h=300&s=2105,1259" width="200" height="300"></iframe>');
        }
    }
});