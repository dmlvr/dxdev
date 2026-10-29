$(() => {
  const store = [];
  const messages = [{ role: 'system', content: systemPrompt }];

  DevExpress.localization.loadMessages({
    en: {
      'dxChat-emptyListMessage': 'Chat is Empty',
      'dxChat-emptyListPrompt': 'Click a tile below to call a function.',
      'dxChat-textareaPlaceholder': 'Ask AI Assistant...',
    },
  });

  const delay = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

  async function requestModel(messageList) {
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: messageList,
        tools,
        tool_choice: 'auto',
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`The AI service returned an error (${response.status}).`);
    }

    const data = await response.json();

    return data.choices[0].message;
  }

  // Runs one tool the model asked for and returns the data of the ToolCall for the Chat
  async function runTool(call) {
    const { name } = call.function;
    let args = {};

    try {
      args = JSON.parse(call.function.arguments || '{}');
    } catch (e) {
      args = {};
    }

    await delay(TOOL_DELAY + Math.random() * 600);

    try {
      const implementation = toolImplementations[name];

      if (!implementation) {
        throw new Error(TOOL_ERROR_TEXT);
      }

      const value = implementation(args);
      const result = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

      return { name, arguments: args, status: 'success', result };
    } catch (error) {
      return { name, arguments: args, status: 'error', result: error.message };
    }
  }

  // Asks the model; while it asks for tools, runs them (in parallel) and gives it the results
  async function getAIResponse(messageList) {
    const toolCalls = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const answer = await requestModel(messageList);

      if (!answer.tool_calls?.length) {
        return { text: answer.content ?? '', toolCalls };
      }

      messageList.push(answer);

      const results = await Promise.all(answer.tool_calls.map(runTool));

      results.forEach((result, index) => {
        toolCalls.push(result);
        messageList.push({
          role: 'tool',
          tool_call_id: answer.tool_calls[index].id,
          content: result.status === 'error' ? `Error: ${result.result}` : result.result,
        });
      });
    }

    return { text: '', toolCalls };
  }

  function getErrorMessage(err) {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Unknown error';
  }

  function alertError(message) {
    instance.option({ alerts: [{ message }] });

    setTimeout(() => {
      instance.option({ alerts: [] });
    }, ALERT_TIMEOUT);
  }

  function toggleDisabledState(disabled, event) {
    instance.element().toggleClass(CHAT_DISABLED_CLASS, disabled);
    toolbar.option('items[1].options.disabled', disabled);

    if (disabled) {
      event?.target.blur();
    } else {
      event?.target.focus();
    }
  }

  async function processMessageSending(message, event) {
    toggleDisabledState(true, event);

    const history = messages.length;

    messages.push({ role: 'user', content: message.text });
    instance.option({ typingUsers: [assistant] });

    try {
      const { text, toolCalls } = await getAIResponse(messages);

      instance.option({ typingUsers: [] });

      messages.push({ role: 'assistant', content: text });

      renderAssistantMessage(text, toolCalls);
    } catch (err) {
      instance.option({ typingUsers: [] });
      messages.length = history;
      alertError(getErrorMessage(err));
    } finally {
      toggleDisabledState(false, event);
    }
  }

  function renderAssistantMessage(text, toolCalls) {
    const message = {
      id: Date.now(),
      timestamp: new Date(),
      author: assistant,
      text,
    };

    if (toolCalls.length) {
      message.toolCalls = toolCalls;
    }

    dataSource.store().push([{ type: 'insert', data: message }]);
  }

  function onClearButtonClick() {
    store.length = 0;
    messages.length = 1;
    instance.option({ alerts: [], typingUsers: [] });
    dataSource.reload();
  }

  function sendSuggestion(prompt) {
    const message = {
      id: Date.now(),
      timestamp: new Date(),
      author: user,
      text: prompt,
    };

    dataSource.store().push([{ type: 'insert', data: message }]);

    if (!instance.option('alerts').length) {
      processMessageSending(message);
    }
  }

  function createSuggestionCard(card) {
    return $('<button>')
      .attr({ type: 'button', tabindex: 0 })
      .addClass('chat-suggestion-card')
      .append(
        $('<div>').addClass('chat-suggestion-card-title').text(card.title),
        $('<div>').addClass('chat-suggestion-card-prompt').text(card.description),
      )
      .on('click', () => {
        sendSuggestion(card.prompt);
      });
  }

  // The template of the message content: it is used to show how the tool calls behave next to a template
  function renderMessageContent(message, element) {
    $('<div>')
      .addClass('custom-template-label')
      .text('messageTemplate')
      .appendTo(element);

    $('<div>')
      .addClass('chat-messagebubble-text')
      .text(message.text)
      .appendTo(element);
  }

  function renderMessageTemplate(data, element) {
    renderMessageContent(data.message, element);
  }

  const customStore = new DevExpress.data.CustomStore({
    key: 'id',
    load: () => {
      const d = $.Deferred();

      setTimeout(() => {
        d.resolve([...store]);
      });

      return d.promise();
    },
    insert: (message) => {
      const d = $.Deferred();

      setTimeout(() => {
        store.push(message);
        d.resolve();
      });

      return d.promise();
    },
  });

  const dataSource = new DevExpress.data.DataSource({
    store: customStore,
    paginate: false,
  });

  const toolbar = $('#dx-ai-chat-toolbar').dxToolbar({
    items: [{
      location: 'before',
      text: 'AI Assistant',
      cssClass: 'ai-chat-title',
    }, {
      location: 'after',
      widget: 'dxButton',
      options: {
        icon: 'clearhistory',
        stylingMode: 'text',
        hint: 'Clear chat',
        onClick: onClearButtonClick,
      },
    }],
  }).dxToolbar('instance');

  const instance = $('#dx-ai-chat').dxChat({
    user,
    height: 710,
    dataSource,
    reloadOnChange: false,
    showAvatar: false,
    showDayHeaders: false,
    speechToTextEnabled: true,
    onMessageEntered: (e) => {
      const { message, event } = e;

      dataSource.store().push([{ type: 'insert', data: { id: Date.now(), ...message } }]);

      if (!instance.option('alerts').length) {
        processMessageSending(message, event);
      }
    },
    emptyViewTemplate(data) {
      const $suggestionCards = $('<div>').addClass('chat-suggestion-cards');

      suggestionCards.forEach((card) => {
        $suggestionCards.append(createSuggestionCard(card));
      });

      return $('<div>').append(
        $('<div>').addClass('dx-chat-messagelist-empty-message').text(data.texts.message),
        $('<div>').addClass('dx-chat-messagelist-empty-prompt').text(data.texts.prompt),
        $suggestionCards,
      );
    },
  }).dxChat('instance');

  // The options of the demo
  $('#theme-select').dxSelectBox({
    label: 'Theme',
    labelMode: 'outside',
    items: themes,
    displayExpr: 'text',
    valueExpr: 'value',
    value: new URLSearchParams(window.location.search).get('theme') || 'fluent-next.blue.light',
    width: 280,
    // Some widget settings depend on the theme when a widget is created, so the page is loaded again
    onValueChanged: ({ value }) => {
      const params = new URLSearchParams(window.location.search);

      params.set('theme', value);
      window.location.search = params.toString();
    },
  });

  $('#expand-all').dxCheckBox({
    text: 'toolCallOptions.expandAll',
    value: false,
    onValueChanged: ({ value }) => {
      instance.option('toolCallOptions.expandAll', value);
    },
  });

  $('#show-in-message-template').dxCheckBox({
    text: 'toolCallOptions.showInMessageTemplate',
    value: false,
    onValueChanged: ({ value }) => {
      instance.option('toolCallOptions.showInMessageTemplate', value);
    },
  });

  $('#use-message-template').dxCheckBox({
    text: 'messageTemplate',
    value: false,
    onValueChanged: ({ value }) => {
      instance.option('messageTemplate', value ? renderMessageTemplate : null);
    },
  });
});
