define(['jquery'], function ($) {
    return {
        init: function () {
            if (window.location.href.toLowerCase().indexOf('authenticate') != -1)
                return;
            //
            //example: add new button in main menu
            var timer = null;
            timer = setInterval(function () {
                var $mainMenu = $('.b-header-icons');
                if ($mainMenu.length > 0) {//wait applyBindings
                    clearInterval(timer);
                    //
                    $mainMenu.append('<a id="myButtonID" class="b-header-icons__item" style="display:inline-block;"><span style="background:url(../images/logo.png);background-size:cover;width:26px;height:26px;"></span></a>');
                    $('#myButtonID').click(function () {
                        document.location.href = 'http://www.inframanager.ru';
                    });
                }
            }, 200);
        }
    }
});