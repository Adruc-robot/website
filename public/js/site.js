document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll(".datatable").forEach(table => {
        new simpleDatatables.DataTable(table);
    });

});