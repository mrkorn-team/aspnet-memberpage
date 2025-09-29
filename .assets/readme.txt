Hello, I would like to work with you to finished my aspnet-memberpage project.
- Project public share links --> https://github.com/mrkorn-team/aspnet-memberpage
- We will create members/index.cshtml page model to be able to list users (only their picture and name) edit user name and picture in this page.
- When user click edit the Save and Cancel button link appear instead.

- separate js scripts and css from view page to be class in member-edit.js and member-edit.css.
- implement .js and .css in the very bottom of index.cshtml like this @section Scripts { <script src="~/js/members.js" asp-append-version="true"></script> } @section Styles { <link href="~/css/members.css" asp-append-version="true" rel="stylesheet" /> } * let's preview you design idea before start acting coding for each step we discuss, please.

=== Coding requirement ===
- asp.net9.0.9 + razor page style
- bootstrap 5.3.8
- pure js
- ajax/fetch() + mapping endpoints (app.mappost(), app.mapget()) to avoid page reload flickering.
- fully nullable enabled c#.