(function ($) {
    'use strict';
    $(function () {
        const userField = $('#id_user');
        const nameField = $('#id_name');
        const emailField = $('#id_email');
        const phoneField = $('#id_phone');

        function updateFields() {
            const userId = userField.val();
            if (userId) {
                // If user is selected, these fields will be synced from the account
                // We add a visual cue and disable them
                nameField.prop('disabled', true).css('background-color', '#f8f8f8');
                emailField.prop('disabled', true).css('background-color', '#f8f8f8');
                phoneField.prop('disabled', true).css('background-color', '#f8f8f8');

                // Add a note if it doesn't exist
                if ($('#sync-note').length === 0) {
                    userField.after('<p id="sync-note" style="color: #2b70c9; font-size: 11px; margin-top: 5px;"><b>Note:</b> Name, Email, and Phone will be automatically synchronized from the linked account on save.</p>');
                }
            } else {
                nameField.prop('disabled', false).css('background-color', '');
                emailField.prop('disabled', false).css('background-color', '');
                phoneField.prop('disabled', false).css('background-color', '');
                $('#sync-note').remove();
            }
        }

        // Initialize
        updateFields();

        // Listen for changes
        // Since raw_id_fields might be updated by a popup, we might need a timer or listen for custom events
        // Django's related lookup popup calls dismissRelatedLookupPopup which triggers a 'change' event
        userField.on('change', function () {
            updateFields();
        });

        // Also handle the case where the value is set by the popup specifically
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    updateFields();
                }
            });
        });

        if (userField.length) {
            observer.observe(userField[0], { attributes: true });
        }
    });
})(django.jQuery);
