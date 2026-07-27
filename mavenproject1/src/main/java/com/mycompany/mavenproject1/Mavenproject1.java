package com.mycompany.mavenproject1;

import io.javalin.Javalin;
import java.util.List;
import java.util.Map;

public class Mavenproject1 {

    public static void main(String[] args) {
        Javalin app = Javalin.create(config -> {
            config.bundledPlugins.enableCors(cors -> {
                cors.addRule(it -> it.anyHost());
            });
        }).start(7000);

        // ==== INVENTARIO (INGREDIENTES) ====
        IngredienteDAO ingredienteDAO = new IngredienteDAO();

        // -- Listar todos --
        app.get("/api/inventario", ctx -> {
            List<Ingrediente> ingredientes = ingredienteDAO.listarTodos();
            ctx.json(ingredientes);
        });

        // -- Buscar por ID --
        app.get("/api/inventario/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Ingrediente ing = ingredienteDAO.buscarPorId(id);
            if (ing != null) {
                ctx.json(ing);
            } else {
                ctx.status(404).result("Ingrediente no encontrado");
            }
        });

        // -- Crear nuevo (Con registro automático de gasto en Finanzas) --
        app.post("/api/inventario", ctx -> {
            Ingrediente nuevo = ctx.bodyAsClass(Ingrediente.class);
            if (ingredienteDAO.registrar(nuevo)) {
                ctx.status(201).json(nuevo);
            } else {
                ctx.status(400).result("No se pudo registrar el ingrediente");
            }
        });

        // -- NUEVO: Surtir Stock / Registrar Compra de Insumos --
        app.post("/api/inventario/comprar", ctx -> {
            CompraRequest req = ctx.bodyAsClass(CompraRequest.class);
            boolean exito = ingredienteDAO.registrarCompraIngrediente(
                req.getIngredienteId(),
                req.getCantidadComprada(),
                req.getCostoTotal(),
                req.getUsuarioId() > 0 ? req.getUsuarioId() : 1,
                req.getCategoriaGastoId() > 0 ? req.getCategoriaGastoId() : 1
            );

            if (exito) {
                ctx.status(200).result("Compra y gasto registrados con éxito en Finanzas.");
            } else {
                ctx.status(400).result("No se pudo procesar la compra.");
            }
        });

        // -- Actualizar --
        app.put("/api/inventario/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Ingrediente datos = ctx.bodyAsClass(Ingrediente.class);
            datos.setIdIngrediente(id); // Vincula el ID de la URL al objeto
            
            if (ingredienteDAO.actualizar(datos)) {
                ctx.json(datos);
            } else {
                ctx.status(400).result("No se pudo actualizar el ingrediente");
            }
        });

        // -- Eliminar --
        app.delete("/api/inventario/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            if (ingredienteDAO.eliminar(id)) {
                ctx.status(204);
            } else {
                ctx.status(400).result("No se pudo eliminar el ingrediente");
            }
        });
        
        app.get("/api/inventario/criticos", ctx -> {
    ctx.json(ingredienteDAO.obtenerIngredientesCriticos());
});

        // ==== CLIENTES ====
        ClienteDAO clienteDAO = new ClienteDAO();

        // -- Listar todos --
        app.get("/api/clientes", ctx -> {
            List<Cliente> clientes = clienteDAO.obtenerTodos();
            ctx.json(clientes);
        });

        // -- Crear nuevo --
        app.post("/api/clientes", ctx -> {
            Cliente nuevo = ctx.bodyAsClass(Cliente.class);
            Cliente creado = clienteDAO.crear(nuevo);
            ctx.status(201).json(creado);
        });

        // -- Actualizar --
        app.put("/api/clientes/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Cliente datos = ctx.bodyAsClass(Cliente.class);
            Cliente actualizado = clienteDAO.actualizar(id, datos);
            ctx.json(actualizado);
        });

        // -- Eliminar --
        app.delete("/api/clientes/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            clienteDAO.eliminar(id);
            ctx.status(204);
        });

 // ==== PEDIDOS Y PRODUCTOS ====
        PedidoDAO pedidoDAO = new PedidoDAO();
        ProductoDAO productoDAO = new ProductoDAO(); 

        // --------------------------------------------------
        // RUTAS DE PRODUCTOS Y CATEGORÍAS
        // --------------------------------------------------
        app.get("/api/categorias", ctx -> {
            ctx.json(productoDAO.listarCategorias());
        });

        app.get("/api/productos", ctx -> {
            ctx.json(productoDAO.listarTodos());
        });

        app.get("/api/productos/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Producto prod = productoDAO.buscarPorId(id);
            if (prod != null) {
                ctx.json(prod);
            } else {
                ctx.status(404).result("Producto no encontrado");
            }
        });

        app.post("/api/productos", ctx -> {
            Producto nuevo = ctx.bodyAsClass(Producto.class);
            int idGenerado = productoDAO.registrar(nuevo);
            if (idGenerado > 0) {
                nuevo.setIdProducto(idGenerado);
                ctx.status(201).json(nuevo);
            } else {
                ctx.status(400).result("No se pudo registrar el producto");
            }
        });

        app.put("/api/productos/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Producto datos = ctx.bodyAsClass(Producto.class);
            datos.setIdProducto(id);
            if (productoDAO.actualizar(datos)) {
                ctx.json(datos);
            } else {
                ctx.status(400).result("No se pudo actualizar el producto");
            }
        });

        app.delete("/api/productos/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            if (productoDAO.eliminar(id)) {
                ctx.status(200).result("Producto eliminado correctamente");
            } else {
                ctx.status(400).result("No se pudo eliminar el producto");
            }
        });

        // --------------------------------------------------
        // RUTAS DE PEDIDOS
        // --------------------------------------------------
        // 1. Obtener todos los pedidos
        app.get("/api/pedidos", ctx -> {
            List<Pedido> pedidos = pedidoDAO.obtenerTodos();
            ctx.json(pedidos);
        });

        // 2. Obtener el detalle específico de un pedido
        app.get("/api/pedidos/{id}/detalle", ctx -> {
            int idPedido = Integer.parseInt(ctx.pathParam("id"));
            List<DetallePedido> detalle = pedidoDAO.obtenerDetallePorPedido(idPedido);
            ctx.json(detalle);
        });

        // 3. Crear un nuevo pedido con Descuento Automático de Inventario
        app.post("/api/pedidos", ctx -> {
            try {
                Pedido nuevoPedido = ctx.bodyAsClass(Pedido.class);
                
                if (pedidoDAO.crearPedidoConDescuentoInventario(nuevoPedido)) {
                    ctx.status(201).result("Pedido registrado e inventario descontado con éxito.");
                } else {
                    ctx.status(400).result("No se pudo procesar el pedido.");
                }
            } catch (java.sql.SQLException e) {
                System.err.println("❌ ERROR DE TRANSACCIÓN: " + e.getMessage());
                
                if (e.getMessage().contains("Stock insuficiente")) {
                    ctx.status(400).result(e.getMessage());
                } else {
                    ctx.status(500).result("Error interno en la BD: " + e.getMessage());
                }
            } catch (Exception e) {
                ctx.status(500).result("Error procesando la solicitud: " + e.getMessage());
            }
        });

        // 4. Cambiar el estado de un pedido (Con validación y descuento de Stock de Producto)
        app.patch("/api/pedidos/{id}/estado", ctx -> {
            try {
                int idPedido = Integer.parseInt(ctx.pathParam("id"));
                String nuevoEstado = ctx.body();

                if (productoDAO.actualizarEstadoYGenerarIngreso(idPedido, nuevoEstado)) {
                    ctx.status(200).json(Map.of("mensaje", "Estado del pedido actualizado e inventario descontado."));
                } else {
                    ctx.status(400).json(Map.of("error", "No se pudo actualizar el estado del pedido."));
                }
            } catch (java.sql.SQLException e) {
                System.err.println("❌ ALERTA DE STOCK: " + e.getMessage());
                ctx.status(400).json(Map.of("error", e.getMessage()));
            } catch (Exception e) {
                ctx.status(500).json(Map.of("error", "Error en el servidor: " + e.getMessage()));
            }
        });

        // 5. Actualizar un pedido completo
        app.put("/api/pedidos/{id}", ctx -> {
            int idPedido = Integer.parseInt(ctx.pathParam("id"));
            Pedido pedidoModificado = ctx.bodyAsClass(Pedido.class);
            pedidoModificado.setId(idPedido);
            
            if (pedidoDAO.actualizarPedido(pedidoModificado)) {
                ctx.status(200).result("Pedido actualizado correctamente");
            } else {
                ctx.status(500).result("Error interno al actualizar el pedido");
            }
        });

        // 6. Eliminar un pedido
        app.delete("/api/pedidos/{id}", ctx -> {
            int idPedido = Integer.parseInt(ctx.pathParam("id"));
            
            if (pedidoDAO.eliminarPedido(idPedido)) {
                ctx.status(200).result("Pedido eliminado correctamente");
            } else {
                ctx.status(500).result("Error interno al eliminar el pedido");
            }
        });
        // ==== RECETAS ====
        RecetaDAO recetaDAO = new RecetaDAO();

        // -- Obtener la receta de un producto específico --
        app.get("/api/recetas/producto/{idProducto}", ctx -> {
            int idProducto = Integer.parseInt(ctx.pathParam("idProducto"));
            List<Receta> receta = recetaDAO.obtenerPorProducto(idProducto);
            ctx.json(receta);
        });

// En Mavenproject1.java
app.post("/api/recetas/producto/{idProducto}", ctx -> {
    int idProducto = Integer.parseInt(ctx.pathParam("idProducto"));
    Receta[] listaArray = ctx.bodyAsClass(Receta[].class);
    List<Receta> nuevosIngredientes = java.util.Arrays.asList(listaArray);

    try {
        if (recetaDAO.guardarReceta(idProducto, nuevosIngredientes)) {
            ctx.status(200).result("Receta actualizada correctamente");
        } else {
            // Retornamos 500 genérico si devuelve false
            ctx.status(500).result("Error interno: la BD rechazó la transacción.");
        }
    } catch (Exception e) {
        // Muestra el mensaje SQL real si ocurre una excepción
        ctx.status(500).result("Error BD: " + e.getMessage());
    }
});
        
        // ==== DASHBOARD (resumen global) ====
        DashboardDAO dashboardDAO = new DashboardDAO();
        app.get("/api/dashboard", ctx -> {
            ctx.json(dashboardDAO.obtenerResumen());
        });
        
        // ==== ENDPOINTS DE ENTREGAS ====
        EntregaDAO entregaDAO = new EntregaDAO();

        // Obtener el listado
        app.get("/api/entregas", ctx -> {
            ctx.json(entregaDAO.obtenerTodas());
        });

        // Registrar entrega
        app.post("/api/entregas", ctx -> {
            Entrega nueva = ctx.bodyAsClass(Entrega.class);
            if (entregaDAO.crear(nueva)) {
                ctx.status(201).result("Entrega guardada exitosamente.");
            } else {
                ctx.status(500).result("No se pudo registrar la entrega.");
            }
        });

        // Actualizar datos de entrega
        app.put("/api/entregas/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            Entrega modificada = ctx.bodyAsClass(Entrega.class);
            modificada.setId(id);

            if (entregaDAO.actualizar(modificada)) {
                ctx.status(200).result("Entrega editada de manera exitosa.");
            } else {
                ctx.status(500).result("Ocurrió un error al actualizar los datos.");
            }
        });

        // Eliminar entrega física
        app.delete("/api/entregas/{id}", ctx -> {
            int id = Integer.parseInt(ctx.pathParam("id"));
            if (entregaDAO.eliminar(id)) {
                ctx.status(200).result("Entrega eliminada con éxito.");
            } else {
                ctx.status(500).result("Error al eliminar el registro.");
            }
        });

        // ==============================================
        // ==== ENDPOINTS DE FINANZAS ====
        // ==============================================
        FinanzasDAO finanzasDAO = new FinanzasDAO();

        // 1. Obtener todos los movimientos combinados (Tabla)
        app.get("/api/finanzas", ctx -> {
            ctx.json(finanzasDAO.obtenerTodos());
        });
        
        // 2. Obtener datos para la gráfica de Productos Más Vendidos
        app.get("/api/finanzas/top-ventas", ctx -> {
            ctx.json(finanzasDAO.obtenerProductosMasVendidos());
        });

        // 3. NUEVO: Obtener KPIs mensuales (Tarjetas superiores)
        app.get("/api/finanzas/kpis", ctx -> {
            ctx.json(finanzasDAO.obtenerResumenKpis());
        });

        // 4. NUEVO: Obtener datos dinámicos para la gráfica principal (semana, mes, anio)
        app.get("/api/finanzas/grafica", ctx -> {
            String filtro = ctx.queryParam("filtro");
            ctx.json(finanzasDAO.obtenerDatosGrafica(filtro != null ? filtro : "mes"));
        });
        
        // ==== AUTENTICACIÓN (LOGIN) ====
        UsuarioDAO usuarioDAO = new UsuarioDAO();

        app.post("/api/login", ctx -> {
            try {
                LoginRequest request = ctx.bodyAsClass(LoginRequest.class);
                LoginResponse response = usuarioDAO.autenticarUsuario(request.getUsername(), request.getPassword());
                
                if (response != null) {
                    ctx.status(200).json(response);
                } else {
                    ctx.status(401).json(Map.of("error", "Usuario o contraseña incorrectos, o cuenta inactiva."));
                }
            } catch (Exception e) {
                e.printStackTrace();
                ctx.status(400).json(Map.of("error", "Error procesando la petición JSON."));
            }
        });
        
        // =======================================================
        // MÓDULO DE CONFIGURACIÓN Y SEGURIDAD
        // =======================================================
        ConfiguracionDAO configuracionDAO = new ConfiguracionDAO();

        // 1. Obtener los Datos Generales del Negocio
        app.get("/api/configuracion", ctx -> {
            Configuracion config = configuracionDAO.obtenerConfiguracion();
            if (config != null) {
                ctx.json(Map.of(
                    "nombre", config.getNombreNegocio(),
                    "descripcion", config.getDatosGenerales()
                ));
            } else {
                ctx.status(404).result("Configuración no encontrada.");
            }
        });

        // 2. Guardar/Actualizar Datos Generales del Negocio
        app.put("/api/configuracion", ctx -> {
            Map<String, String> body = ctx.bodyAsClass(Map.class);
            Configuracion config = new Configuracion();
            config.setNombreNegocio(body.get("nombre"));
            config.setDatosGenerales(body.get("descripcion"));

            if (configuracionDAO.actualizarConfiguracion(config)) {
                ctx.status(200).result("Configuración actualizada con éxito.");
            } else {
                ctx.status(500).result("Error al guardar la configuración.");
            }
        });

        // 3. Modificar Credenciales (Actualizar Contraseña)
        app.put("/api/seguridad", ctx -> {
            PasswordChangeRequest req = ctx.bodyAsClass(PasswordChangeRequest.class);
            int idUsuarioMock = 1; 
            
            int resultado = configuracionDAO.cambiarContrasena(idUsuarioMock, req.getActual(), req.getNueva());
            if (resultado == 1) {
                ctx.status(200).result("Contraseña modificada correctamente.");
            } else if (resultado == 0) {
                ctx.status(401).result("La contraseña actual es incorrecta.");
            } else {
                ctx.status(500).result("Error interno en el servidor.");
            }
        });

        // 4. Listar Sesiones Activas
        app.get("/api/sesiones", ctx -> {
            int idUsuarioMock = 1; 
            List<Sesion> sesiones = configuracionDAO.obtenerSesionesActivas(idUsuarioMock);
            
            List<Map<String, Object>> JSONSesiones = sesiones.stream().map(s -> {
                Map<String, Object> mapa = new java.util.HashMap<>();
                mapa.put("id", s.getId());
                mapa.put("dispositivo", "Navegador de Escritorio");
                mapa.put("actual", s.getToken() != null && s.getToken().equals("TOKEN_ACTUAL_MOCK"));
                mapa.put("ip", s.getIpAddress() != null ? s.getIpAddress() : "127.0.0.1");
                mapa.put("ultima", "Activa recientemente");
                return mapa;
            }).toList(); 
            
            ctx.json(JSONSesiones);
        });

        // 5. Cerrar Todas las Demás Sesiones Activas
        app.delete("/api/sesiones/otras", ctx -> {
            int idUsuarioMock = 1;
            String tokenActualMock = "TOKEN_ACTUAL_MOCK";
            if (configuracionDAO.cerrarOtrasSesiones(idUsuarioMock, tokenActualMock)) {
                ctx.status(200).result("Otras sesiones cerradas.");
            } else {
                ctx.status(500).result("Error al procesar la purga de sesiones.");
            }
        });

        // 6. Cerrar una Sesión Específica por ID
        app.delete("/api/sesiones/{id}", ctx -> {
            int idSesion = Integer.parseInt(ctx.pathParam("id"));
            int idUsuarioMock = 1;
            if (configuracionDAO.cerrarSesionEspecifica(idSesion, idUsuarioMock)) {
                ctx.status(200).result("Sesión revocada.");
            } else {
                ctx.status(500).result("No se pudo revocar la sesión.");
            }
        });

        System.out.println("Servidor corriendo en http://localhost:7000");
    }
}