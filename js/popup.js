var COOKIEJAR_API_URL = 'https://evmecookie.appspot.com/api';

var user, status1;

function $(id) {
    return document.getElementById(id);
}

function createElement(name, attributes, textValue)
{
    var element = document.createElement(name);
    for (var attribute in attributes)
    {
        element.setAttribute(attribute, attributes[attribute]);
    }
    if (textValue)
    {
        element.appendChild(document.createTextNode(textValue));
    }
    return element;
}

function ajax(method, url, data, success, failure) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if (xhr.readyState == 4)
        {
            console.log(xhr);
            if (xhr.status == 200 && success)
            {
                success.call(xhr);
            }
            else if (xhr.status != 200 && failure)
            {
                failure.call(xhr);
            }
        }
    };
    xhr.open(method, url, true);
    if (data)
    {
        formData = new FormData();
        for (i in data)
        {
            formData.append(i, data[i]);
        }
        xhr.send(formData);
    }
    else
    {
        xhr.send(null);
    }
}

// called with with the anchor element as this
function deleteCookie()
{
    status1.show('Deleting cookie...');
    var cookieId = this.getAttribute('data-cookie-id');
    ajax(
        'DELETE',
        COOKIEJAR_API_URL + '/cookie/' + cookieId,
        null,
        function() {
            status1.hide();
            refreshCookies();
        },
        function() {
            status1.error('Unable to delete cookie');
        }
    );
}

// called with with the anchor element as this
function updateCookie()
{
    // TODO: Add the ability to alter the description
    //       The backend supports it...
    status1.show('Updating cookie...');
    var cookieId = this.getAttribute('data-cookie-id');

    // 10bis save their cookies both on 10bis.co.il and www.10bis.co.il
    // this way I'm querying for both.
    chrome.cookies.getAll({domain: '10bis.co.il'}, function(cookies){
        ajax(
            'POST',
            COOKIEJAR_API_URL + '/cookie/' + cookieId,
            {
                content: JSON.stringify(cookies)
            },
            function(){
                status1.success('Cookie updated');
            },
            function(){
                status1.error('Unable to update cookie');
            }
        );
    });
}

// called with with the anchor element as this
function useCookie()
{
    status1.show('Loading cookie ...', status1.STAY);
    var cookieId = this.getAttribute('data-cookie-id');
    ajax(
        'GET',
        COOKIEJAR_API_URL + '/cookie/' + cookieId,
        null,
        function(){
            cookie = JSON.parse(this.responseText);
            content = JSON.parse(cookie.content);
            for (item in content)
            {
                item = content[item];

                // the object returned by chrome.cookies.get is a bit different
                // make adjustments...
                item.url = 'http://www.10bis.co.il';
                delete item.session;
                delete item.hostOnly;

                // TODO: Put a callback and handle errors
                console.log(item);
                chrome.cookies.set(item);
            }
            status1.success('Cookie ' + cookie.description + ' loaded');
        },
        function(){
            status1.error('An error occured while trying to fetch cookie :(');
        }
    );
}

function refreshCookies()
{
    updatingStart();

    var othersUl = $('others');
    othersUl.innerHTML = '';

    var ownerUl = $('owner');
    ownerUl.innerHTML = '';

    ajax(
        'GET',
        COOKIEJAR_API_URL + '/cookie',
        null,
        function(){
            cookies = JSON.parse(this.responseText);

            // populate list
            for (cookie in cookies)
            {
                cookie = cookies[cookie];
                li = document.createElement('li');
                li.appendChild(createElement('span', {'class': 'description'}, cookie.description));
                li.appendChild(createElement('span', {'class': 'author'}, cookie.author));

                // if we are not the cookie owner
                if (cookie.author != user) {
                    use = createElement('a', {
                        'href': '#',
                        'data-cookie-id': cookie.id,
                        'class': 'btn btn-success btn-mini'
                    }, 'הצטרף');
                    use.addEventListener('click', useCookie);
                    li.appendChild(use);

                    othersUl.appendChild(li);
                } else {
                    // delete, update links

                    del = createElement('a', {
                        'href': '#',
                        'data-cookie-id': cookie.id,
                        'class': 'btn btn-mini btn-inverse'
                    }, 'מחק');
                    del.addEventListener('click', deleteCookie);
                    li.appendChild(del);

                    update = createElement('a', {
                        'href': '#',
                        'data-cookie-id': cookie.id,
                        'class': 'btn btn-mini btn-inverse'
                    },  'עדכן');
                    update.addEventListener('click', updateCookie);
                    li.appendChild(update);

                    ownerUl.appendChild(li);

                    document.body.classList.add("has-owner")
                }
            }

            
            if (cookies.length == 0)
            {
                status1.error('No cookies :(');
            }
            updatingStop();
        },
        function(){
            updatingStop();
        }
    );
}

function updatingStart() {
    document.body.classList.add('updating');
    document.body.classList.remove("has-owner");
}

function updatingStop() {
    document.body.classList.remove('updating');
}

function createCookie()
{

    status1.show('Creating cookie', status1.STAY);
    $('create').disabled = true;
    var description = $('description').value;

    // 10bis save their cookies both on 10bis.co.il and www.10bis.co.il
    // this way I'm querying for both.
    chrome.cookies.getAll({domain: '10bis.co.il'}, function(cookies){
        ajax(
            'POST',
            COOKIEJAR_API_URL + '/cookie',
            {
                description: description,
                content: JSON.stringify(cookies)
            },
            function(){
                $('description').value = '';
                $('create').disabled = false;
                status1.hide();
                refreshCookies();
            },
            function(){
                status1.error('Failed creating cookie :(');
            }
        );
    });
}

document.addEventListener('DOMContentLoaded', function(){
    status1 = new Status({
        'element': $('status')
    });
    updatingStart();
    ajax(
        'GET',
        COOKIEJAR_API_URL + '/whoami',
        null,
        function(){
            user = this.responseText;
            if (user == '')
            {
                status1.error('Not logged in');
                window.open(COOKIEJAR_API_URL + '/cookie');
            }
            else
            {
                $('create').addEventListener('click', createCookie);
                $('refresh').addEventListener('click', refreshCookies);
                refreshCookies();
            }
            updatingStop();
        },
        function(){
            status1.error('Unable to query who you are :(');
        }
    );
});

function Status(cfg) {
    var self = this,
        el = cfg.element,
        duration = cfg.duration || 4000,
        isShowing = false,
        hideTimeout;

    this.show = function(msg, stay, type) {
        show(function() {
            isShowing = true;
            el.innerHTML = msg;
            el.className = 'show '+(type || '');
            hideTimeout = setTimeout(hide, duration);    
        });
    };

    this.success = function(msg, stay) {
        self.show(msg, stay, 'success');
    };

    this.error = function(msg, stay) {
        self.show(msg, stay, 'error');
    };

    this.hide = function() {
        hide()
    };

    function hide() {
        hideTimeout && clearTimeout(hideTimeout);
        isShowing = false;
        el.className = '';
    }

    function show(cb) {
        if (isShowing) {
            hide();
            setTimeout(cb, 500)
        } else {
            cb();
        }
    }
}
