define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        ViewModel: function (loginPasswordAuthenticationEnabled) {
            var self = this;
            self.ajaxControl = new ajaxLib.control();

            // Устанавливаем значение по умолчанию: STEPCON\
            self.loginName = ko.observable('STEPCON\\');
            self.password = ko.observable('');

            self.getPasswordEncrypted = function () {
                var retval = '';
                const key = 13;
                var pass = self.password();

                for (var i = 0; i < pass.length; i++)
                    retval += String.fromCharCode(pass[i].charCodeAt(0) ^ key);

                return retval;
            };

          self.login = function (ob) {
    var login = self.loginName().trim();

    // Если поле пустое — не отправляем
    if (!login) {
        return;
    }

    // Если содержит @ — это email, не добавляем домен
    if (login.includes('@')) {
        // Оставляем как есть
    }
    // Если уже содержит \ — возможно, уже с доменом
    else if (login.includes('\\')) {
        // Проверим, начинается ли с STEPCON (регистронезависимо)
        var parts = login.split('\\');
        if (parts.length >= 2) {
            var domain = parts[0].trim();
            var username = parts.slice(1).join('\\'); // поддержка \ в имени

            // Приводим домен к верхнему регистру и проверяем
            if (domain.toUpperCase() !== 'STEPCON') {
                // Если домен указан, но не STEPCON — возможно, ошибка?
                // Но лучше отправить как есть, чем блокировать
            }
            // Восстанавливаем с правильным доменом (в верхнем регистре)
            login = 'STEPCON\\' + username;
        }
    }
    // Если нет \ и нет @ — значит, только имя пользователя
    else {
        login = 'STEPCON\\' + login;
    }

    // ⚠️ ВАЖНО: обновляем observable, чтобы UI и логика "видели" правильное значение
    self.loginName(login);

    var obj = {
        'loginName': login,
        'passwordEncrypted': self.getPasswordEncrypted()
    };

    self.ajaxControl.Ajax($('.b-auth-submit'),
        {
            dataType: 'json',
            url: 'accountApi/SignIn',
            method: 'POST',
            data: obj
        },
        function (response) {
            if (response.Success == false) {
                if (response.RedirectUrl) {
                    showSpinner();
                    setLocation(response.RedirectUrl);
                } else {
                    $('.b-auth-error')[0].style.visibility = 'visible';
                }
            }
            else if (returnUrl) {
                showSpinner();
                window.location.href = returnUrl.replace(/&amp;/g, '&');
            }
            else {
                showSpinner();
                setLocation('SD/Table');
            }
        });
};

            self.forgotPassword = function (ob) {
                require(['sweetAlert'], function () {
                    swal({
                        title: getTextResource('PasswordRecovery'),
                        text: getTextResource('PasswordRecoveryQuestion'),
                        showCancelButton: true,
                        closeOnConfirm: false,
                        closeOnCancel: true,
                        confirmButtonText: getTextResource('ButtonOK'),
                        cancelButtonText: getTextResource('ButtonCancel')
                    },
                    function (value) {
                        if (value == true) {
                            showSpinner();
                            self.ajaxControl.Ajax(null,
                                {
                                    dataType: 'json',
                                    url: 'accountApi/RestorePassword',
                                    method: 'POST',
                                    data: { '': self.loginName() }
                                },
                                function (response) {
                                    hideSpinner();
                                    swal(getTextResource('PasswordRecovery'), response, 'info');
                                },
                                function () {
                                    hideSpinner();
                                    swal(getTextResource('PasswordRecovery'), getTextResource('AjaxError') + '\n[Login.js, forgotPassword]', 'error');
                                });
                        }
                    });
                });
            };

            self.setLanguage = function (data, event) {
                var target;
                if (event.target) target = event.target;
                else if (event.srcElement) target = event.srcElement;

                var cultureName = $(target).attr('data-param');
                if (cultureName == locale)
                    return;

                showSpinner();
                self.ajaxControl.Ajax(null,
                    {
                        url: 'accountApi/SetUserLanguage',
                        method: 'POST',
                        data: { '': cultureName }
                    },
                    function (response) {
                        if (response == false) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[Login.js, setLanguage]', 'error');
                            });
                        }
                        else
                            window.location.reload(true);
                    },
                    null,
                    hideSpinner);
            };

            self.onEnter = function (d, e) {
                if (e.keyCode == 13)
                    self.login();
                return true;
            };

            self.AfterRender = function () {
                getLogoPath('login').done(function (path) {
                    var elem = document.getElementsByClassName('b-auth-logo')[0];
                    elem.style.background = 'url(' + path + ') no-repeat center';
                    elem.style.backgroundSize = 'contain';
                });

                if (loginPasswordAuthenticationEnabled == false)
                    $('#b-auth-forgotPass-link').remove();

                $('.b-auth-showPass').on('click', function () {
                    if ($(this).hasClass('b-auth-showPass__active')) {
                        $(this).removeClass('b-auth-showPass__active');
                        $(this).siblings('input').attr('type', 'password');
                    } else {
                        $(this).addClass('b-auth-showPass__active');
                        $(this).siblings('input').attr('type', 'text');
                    }
                });

                // Устанавливаем фокус и курсор в конец строки
                var input = document.getElementById('firstInput');
                if (input) {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                }

                // Auto sign-in (Windows Auth)
                self.ajaxControl.Ajax($('.b-auth-submit'),
                    {
                        dataType: 'json',
                        url: 'Windows/Authenticate',
                        method: 'POST',
                        data: {}
                    },
                    function (response) {
                        if (response == true)
                            setLocation('SD/Table');
                    },
                    function () { /* не вышло, ну и ладно */ });
            };
        }
    };
    return module;
});