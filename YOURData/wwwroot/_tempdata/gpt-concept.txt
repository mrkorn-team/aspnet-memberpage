Hello, I would like to work with you to finished my aspnet-memberpage project.

=== Description ===

- Project public share links --> https://github.com/mrkorn-team/aspnet-memberpage
- We will create members/index.cshtml page model to list users (picture and name) and able to be edited in same page.
- When user click edit --> show Save and Cancel btn-link, hide edit btn-link

* Review the summary of our design idea before writing code.


=== Coding requirement ===

- asp.net9.0.9 + razor page style
- bootstrap 5.3.8
- pure js
- ajax/fetch() + mapping endpoints (app.mappost(), app.mapget()) to avoid page reload flickering.
- fully nullable enabled c#.
- separate js scripts and css from view page to be class --> member-edit.js and member-edit.css.


=== Optional ===
- implement .js and .css in the very bottom of index.cshtml like this @section Scripts { <script src="~/js/members.js" asp-append-version="true"></script> } @section Styles { <link href="~/css/members.css" asp-append-version="true" rel="stylesheet" /> }