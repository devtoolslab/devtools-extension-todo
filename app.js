$(document).ready(function() {

  var currentSite = '';
  var currentPage = '';
  var currentHash = '';

  var alignHeightsToTheMaximumColumnLength = function alignHeightsToTheMaximumColumnLength() {
    //Align heights to the max found
    var max_height = 0;
    $('.to-do-list').each(function(index, list) {
      var list_height = $(list).height();
      if (list_height > max_height) max_height = list_height;
    });
    $('.to-do-list').height(max_height);
  };

  // Create a communication channel with the tab
  (function createChannel() {
    //Create a port with background page for continous message communication
    var port = chrome.extension.connect({
        name: "Page URL Communication"
    });


    // Listen to messages from the background page
    port.onMessage.addListener(function (message) {
      console.log(message);
      if (typeof message === 'number') {
        sendObjectToInspectedPage({action: "code", content: "chrome.extension.sendMessage(window.location, function(message){});"});
        return;
      }

      if (currentSite !== message.host) {
        currentSite = message.host;
        setupTodoList('#site');
      }

      if (currentPage !== message.host + message.pathname) {
        currentPage = message.host + message.pathname;
        currentHash = message.hash;
        setupTodoList('#page');
      }

      alignHeightsToTheMaximumColumnLength();

    });
  }());

  // This sends an object to the background page
  // where it can be relayed to the inspected page
  function sendObjectToInspectedPage(message) {
    if (chrome.devtools) {
      message.tabId = chrome.devtools.inspectedWindow.tabId;
      chrome.extension.sendMessage(message);
    }
  }

  sendObjectToInspectedPage({action: "code", content: "chrome.extension.sendMessage(window.location, function(message){});"});

  Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
  };

  var setupTodoList = function setupTodoList(listName) {

    var higherIndex = 0;
    var all_todos = [];
    var todos = [];
    var todoClass = '';
    var checked = '';
    $(listName + ' ' + '#tasks li').remove();

    //Regenerate the percentage display
    var recalculatePercentage = function recalculatePercentage() {
      $(listName + ' ' + 'h3').html('&nbsp;');
      var all = $(listName + ' ' + '#tasks li').length;
      var notCompleted = $(listName + ' ' + '#tasks li:not(.strike)').length;
      var percentage = Number(((all - notCompleted) * 100) / all).toFixed(0);
      if (isNaN(percentage)) percentage = 0;
      if (percentage) {
        $(listName + ' ' + 'h3').html(percentage + '% completed');
      }
    };

    // Handle saving to the storage the todos
    var saveToLocalStorage = function saveToLocalStorage() {
      var itemName = '';

      switch(listName) {
        case '#general': itemName = 'Todos_general'; break;
        case '#site': itemName = 'Todos_site'; break;
        case '#page': itemName = 'Todos_page'; break;
      }

      var object = {};

      object[itemName] = all_todos.concat(todos);
      chrome.storage.local.set(object);
    };

    // Handle loading from the storage the todos
    var getFromLocalStorage = function getFromLocalStorage() {
      var itemName = '';
      switch(listName) {
        case '#general': itemName = 'Todos_general'; break;
        case '#site': itemName = 'Todos_site'; break;
        case '#page': itemName = 'Todos_page'; break;
      }

      chrome.storage.local.get(itemName, function(val) {
        if (chrome.runtime && chrome.runtime.lastError) console.error(chrome.runtime.lastError);
        all_todos = val[itemName];
        if (!all_todos || !all_todos.length) all_todos = [];

        if (listName == '#general') {
          todos = all_todos;
          all_todos = [];
        }

        if (listName == '#site') {
          todos = all_todos.filter(function(todo) {
            if (todo.domain == currentSite) return true;
          });
        }

        if (listName == '#page') {
          todos = all_todos.filter(function(todo) {
            if (todo.domain == currentSite && todo.url == currentPage) return true;
          });
        }

        all_todos = all_todos.diff(todos);

        processExistingTodos(todos);
      });
    };

    var prepareLiElement = function prepareLiElement(id, theClass, checked, value) {

      if (checked) {
        checked = ' checked ';
      }

      return "<li id='" + id + "' class='" + theClass + "'><input type='checkbox' " + checked + ">" + value + " <span class='delete'></span></li>";
    };

    var processExistingTodos = function processExistingTodos(existingTodos) {
      if (existingTodos && existingTodos.length > 0) {
        var hasCompletedItems = false;

        for (var index in existingTodos){
          if (typeof existingTodos[index] == 'object') {
            theClass = '';
            checked = '';
            if (existingTodos[index].completed === true) {
              theClass = 'strike';
              checked = 'checked';
              hasCompletedItems = true;
            }

            var id = existingTodos[index].index;
            var value = existingTodos[index].text;

            $(listName + ' ' + "#tasks").append(prepareLiElement(id, theClass, checked, value));

            if (higherIndex < existingTodos[index].index) {
              higherIndex = existingTodos[index].index;
            }
          }
        }

        if (hasCompletedItems) {
          $(listName + ' ' + '#clear-completed-items').parent().removeClass('hidden');
        }

        todos = existingTodos;
        saveToLocalStorage();
        recalculatePercentage();
      }
    };

    getFromLocalStorage();

    // Handle submit new task
    var submit_callback = function submit_callback(e) {
      e.preventDefault();

      var value = $(listName + ' ' + "#task").val();
      if (value !== "" ) {

        var id = ++higherIndex;
        var checked = false;
        var theClass = '';

        $(listName + ' ' + "#tasks").append(prepareLiElement(id, theClass, checked, value));

        var todo = { index: higherIndex, text: value };

        if (listName == '#site') {
          todo.domain = currentSite;
        }

        if (listName == '#page') {
          todo.domain = currentSite;
          todo.url = currentPage;
          if (currentHash) todo.hash = currentHash;
        }

        todos.push(todo);
        saveToLocalStorage();

        $(listName + ' ' + "#task").val("");
      }

      recalculatePercentage();

      return false;
    };


    // Submit a new task
    var element = document.querySelectorAll(listName + ' ' + '#tasks-form')[0];
    element.addEventListener("submit", submit_callback, false);

    // Evaluate if "clear completed" links should be shown
    var evaluateIfClearCompletedShouldShow = function evaluateIfClearCompletedShouldShow() {
      if ($(listName + ' ' + '.strike').length > 0) {
        $(listName + ' ' + '#clear-completed-items').parent().removeClass('hidden');
      } else {
        if ($(listName + ' ' + '.strike').length === 0) {
          $(listName + ' ' + '#clear-completed-items').parent().addClass('hidden');
        }
      }
    };

    // Remove a task
    $(document).on("click", listName + " " + ".delete", function() {
      var itemIndex = $(this).parent().attr("id");
      $(this).parent().remove();

      todos.splice(todos.indexOf(todos.filter(function(element) {
        return element.index == itemIndex;
      })[0]), 1);

      evaluateIfClearCompletedShouldShow();
      saveToLocalStorage();
      recalculatePercentage();
    });

    //Complete
    $(document).on("click", listName + " " + "input[type=checkbox]", function() {
      var itemIndex = $(this).parent().attr("id");
      $(this).parent().toggleClass('strike');

      var todo = todos.filter(function(element) {
        return element.index == itemIndex;
      })[0];

      evaluateIfClearCompletedShouldShow();
      saveToLocalStorage();
      recalculatePercentage();
    });

    // Clear completed items
    $(document).on("click", listName + " " + "#clear-completed-items", function() {
      var completed = $(listName + ' ' + '.strike');

      $.each(completed, function(index, value) {
        var todo = todos.splice(todos.indexOf(todos.filter(function(element) {
          return element.index == $(value).attr('id');
        })[0]), 1);

        value.remove();
      });

      $(listName + ' ' + '#clear-completed-items').parent().addClass('hidden');

      saveToLocalStorage();
      recalculatePercentage();
    });
  };

  setupTodoList('#general');



});