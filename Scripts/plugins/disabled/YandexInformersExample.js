define(['jquery'], function ($) {
    return {
        init: function () {
            if (window.location.href.toLowerCase().indexOf('authenticate') != -1)
                return;
            //
            //example: get weather informer
            $(document.body).append('<a style="position:absolute;left:0;top:0;" href="https://clck.yandex.ru/redir/dtype=stred/pid=7/cid=1228/*https://pogoda.yandex.ru/213" target="_blank"><img src="//info.weather.yandex.net/213/2.ru.png?domain=ru" border="0" alt="Яндекс.Погода"/><img width="1" height="1" src="https://clck.yandex.ru/click/dtype=stred/pid=7/cid=1227/*https://img.yandex.ru/i/pix.gif" alt="" border="0"/></a>');
            //
            //example: get services informer
            $(document.body).append('<script type="text/javascript" src="//yastatic.net/es5-shims/0.0.2/es5-shims.min.js" charset="utf-8"></script><script type="text/javascript" src="//yastatic.net/share2/share.js" charset="utf-8"></script><div style="position:absolute;right:0;top:0;" class="ya-share2" data-services="vkontakte,facebook,twitter,blogger,evernote,linkedin,lj,whatsapp"></div>');
        }
    }
});