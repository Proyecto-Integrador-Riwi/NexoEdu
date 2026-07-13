import Auth from "../modules/auth";
const Sidebar= {
    render() {
        const user= Auth.getUser();
        const aside= document.createElement("aside")
        aside.innerHTML= `
            <aside class="w-64 h-screen bg-slate-900 text-white flex flex-col shadow-lg">
                <div class="p-6 border-b border-slate-700">
                    <h1 class="text-2xl font-bold">Panel</h1>
                </div>

                <nav class="flex-1 p-4">
                    <ul id="sidebar-options" class="space-y-2">
                        <li>
                            <a id="settings" href="/configuracion" class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                                Configuración
                            </a>
                        </li>
                    </ul>
                </nav>
            </aside>
        `
        const sidebar= document.getElementById("sidebar-options")
        if(user.role=== "superadmin"){
            sidebar.innerHTML= `
                <li>
                    <a id="gestionate_events" href="/gestion-eventos" class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                        Gestionar eventos
                    </a>
                </li>`
        }
        else if(user.role=== "admin"){
            sidebar.innerHTML= `
                <li>
                    <a id="students" href="/estudiantes" class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                        Consultar estudiantes
                    </a>
                </li>`
        }
        else if(user.role=== "estudiante"){
            sidebar.innerHTML= `
                <li>
                    <a id="events" href="/eventos" class="block px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors duration-200">
                        Eventos
                    </a>
                </li>`
        }
    }
}