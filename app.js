$(document).ready(function() {

  var setupTodoList = function setupTodoList(listName) {

    var higherIndex = 0;
    var todos = [];
    var todoClass = '';
    var checked = '';

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

    // Handle saving to localstorage the todos
    var saveToLocalStorage = function saveToLocalStorage() {
      var itemName = '';

      switch(listName) {
        case '#general': itemName = 'Todos_general'; break;
        case '#site': itemName = 'Todos_site'; break;
        case '#page': itemName = 'Todos_page'; break;
      }

      var object = {};

      object[itemName] = todos;
      console.log(object);
      chrome.storage.local.set(object);
    };

    var getFromLocalStorage = function getFromLocalStorage() {
      var itemName = '';
      switch(listName) {
        case '#general': itemName = 'Todos_general'; break;
        case '#site': itemName = 'Todos_site'; break;
        case '#page': itemName = 'Todos_page'; break;
      }

      chrome.storage.local.get(itemName, function(val) {
        if (chrome.runtime && chrome.runtime.lastError) console.error(chrome.runtime.lastError);
        todos = val[itemName];
        if (!todos || !todos.length) todos = [];
        console.log(itemName, todos);
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

        todos.push({ index: higherIndex, text: value });
        saveToLocalStorage();

        $(listName + ' ' + "#task").val("");
      }

      recalculatePercentage();
      return false;
    };


    // Submit a new task
    var element = document.querySelectorAll(listName + ' ' + '#tasks-form')[0];
    element.addEventListener("submit", submit_callback, false);


    // Remove a task
    $(document).on("click", listName + " " + ".delete", function() {
      var itemIndex = $(this).parent().attr("id");
      $(this).parent().remove();

      todos.splice(todos.indexOf(todos.filter(function(element) {
        return element.index == itemIndex;
      })[0]), 1);

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

      todo.completed = $(this).parent().hasClass('strike');

      if (todo.completed) {
        $(listName + ' ' + '#clear-completed-items').parent().removeClass('hidden');
      } else {
        if ($(listName + ' ' + '.strike').length === 0) {
          $(listName + ' ' + '#clear-completed-items').parent().addClass('hidden');
        }
      }

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

  var alignHeightsToTheMaximumColumnLength = function alignHeightsToTheMaximumColumnLength() {
    //Align heights to the max found
    var max_height = 0;
    $('.to-do-list').each(function(index, list) {
      var list_height = $(list).height();
      if (list_height > max_height) max_height = list_height;
    });
    $('.to-do-list').height(max_height);
  };

  setupTodoList('#general');
  setupTodoList('#site');
  setupTodoList('#page');

  alignHeightsToTheMaximumColumnLength();

});