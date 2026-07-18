const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

if(menuBtn && navLinks){

    menuBtn.addEventListener("click", function(e){

        e.preventDefault();

        navLinks.classList.toggle("active");


        const icon = menuBtn.querySelector("i");


        if(navLinks.classList.contains("active")){

            icon.classList.remove("fa-bars");
            icon.classList.add("fa-xmark");

        }else{

            icon.classList.remove("fa-xmark");
            icon.classList.add("fa-bars");

        }

    });

}