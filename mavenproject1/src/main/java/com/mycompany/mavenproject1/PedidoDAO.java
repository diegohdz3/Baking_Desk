package com.mycompany.mavenproject1;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class PedidoDAO {

// 1. CREAR PEDIDO + DESCONTAR INVENTARIO + KARDEX + FINANZAS (Transaccional)
    public boolean crearPedido(Pedido pedido) throws SQLException {
        String sqlPedido = "INSERT INTO Pedido (cliente_id, usuario_id, estado, total, notas, fecha_entrega) VALUES (?, ?, ?, ?, ?, ?)";
        String sqlDetalle = "INSERT INTO Detalle_Pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)";
        
        // Consultas de Inventario
        String sqlReceta = "SELECT ingrediente_id, cantidad_requerida FROM Receta WHERE producto_id = ?";
        String sqlStockActual = "SELECT nombre, stock_actual FROM Ingrediente WHERE id = ?";
        String sqlDescontarStock = "UPDATE Ingrediente SET stock_actual = stock_actual - ? WHERE id = ?";
        String sqlMovimiento = "INSERT INTO Movimiento_Inventario (ingrediente_id, tipo, cantidad, motivo, usuario_id) VALUES (?, 'salida', ?, ?, ?)";
        
        // Consulta de Finanzas
        String sqlIngreso = "INSERT INTO Ingreso (concepto, monto, fecha, pedido_id) " +
                            "SELECT CONCAT('Pedido #', p.id, ' - ', COALESCE(c.nombre, 'Cliente Directo')), " +
                            "       p.total, CURRENT_DATE(), p.id " +
                            "FROM Pedido p " +
                            "LEFT JOIN Cliente c ON p.cliente_id = c.id " +
                            "WHERE p.id = ? AND NOT EXISTS (SELECT 1 FROM Ingreso WHERE pedido_id = ?)";

        Connection conn = null;

        try {
            conn = ConexionBD.getConexion(); 
            conn.setAutoCommit(false); // 🔒 INICIO DE TRANSACCIÓN ESTRICTA

            // -------------------------------------------------------------
            // PASO A: Guardar Cabecera del Pedido
            // -------------------------------------------------------------
            int idPedidoGenerado = 0;
            String estadoFormateado = (pedido.getEstado() == null || pedido.getEstado().trim().isEmpty()) 
                    ? "nuevo" 
                    : pedido.getEstado().replace("\"", "").trim();

            int usuarioId = pedido.getUsuarioId() > 0 ? pedido.getUsuarioId() : 1;

            try (PreparedStatement stmtPedido = conn.prepareStatement(sqlPedido, Statement.RETURN_GENERATED_KEYS)) {
                stmtPedido.setInt(1, pedido.getClienteId());
                stmtPedido.setInt(2, usuarioId);
                stmtPedido.setString(3, estadoFormateado);
                stmtPedido.setDouble(4, pedido.getTotal());
                stmtPedido.setString(5, pedido.getNotas());
                stmtPedido.setString(6, pedido.getFechaEntrega());
                stmtPedido.executeUpdate();

                ResultSet rsKeys = stmtPedido.getGeneratedKeys();
                if (rsKeys.next()) {
                    idPedidoGenerado = rsKeys.getInt(1);
                } else {
                    throw new SQLException("No se pudo obtener el ID del pedido generado.");
                }
            }

            // -------------------------------------------------------------
            // PASO B: Guardar Detalles y Descontar Ingredientes por Receta
            // -------------------------------------------------------------
            if (pedido.getDetalles() != null && !pedido.getDetalles().isEmpty()) {
                for (DetallePedido dp : pedido.getDetalles()) {

                    // B.1 Insertar fila en Detalle_Pedido
                    try (PreparedStatement stmtDetalle = conn.prepareStatement(sqlDetalle)) {
                        stmtDetalle.setInt(1, idPedidoGenerado);
                        stmtDetalle.setInt(2, dp.getProductoId());
                        stmtDetalle.setInt(3, dp.getCantidad());
                        stmtDetalle.setDouble(4, dp.getPrecioUnitario());
                        stmtDetalle.executeUpdate();
                    }

                    // B.2 Consultar los ingredientes requeridos según la Receta
                    try (PreparedStatement stmtReceta = conn.prepareStatement(sqlReceta)) {
                        stmtReceta.setInt(1, dp.getProductoId());
                        ResultSet rsReceta = stmtReceta.executeQuery();

                        while (rsReceta.next()) {
                            int idIngrediente = rsReceta.getInt("ingrediente_id");
                            double cantPorUnidad = rsReceta.getDouble("cantidad_requerida");
                            double totalADescontar = cantPorUnidad * dp.getCantidad();

                            // B.3 Validar que haya Stock suficiente
                            try (PreparedStatement stmtStock = conn.prepareStatement(sqlStockActual)) {
                                stmtStock.setInt(1, idIngrediente);
                                ResultSet rsStock = stmtStock.executeQuery();

                                if (rsStock.next()) {
                                    String nombreIng = rsStock.getString("nombre");
                                    double stockActual = rsStock.getDouble("stock_actual");

                                    if (stockActual < totalADescontar) {
                                        // Si falta un ingrediente, se interrumpe y nada se guarda en la BD
                                        throw new SQLException("Stock insuficiente de '" + nombreIng + 
                                              "'. Requerido: " + totalADescontar + ", Disponible: " + stockActual);
                                    }
                                }
                            }

                            // B.4 Descontar el Stock del ingrediente
                            try (PreparedStatement stmtDescuento = conn.prepareStatement(sqlDescontarStock)) {
                                stmtDescuento.setDouble(1, totalADescontar);
                                stmtDescuento.setInt(2, idIngrediente);
                                stmtDescuento.executeUpdate();
                            }

                            // B.5 Registrar salida en el historial (Movimiento_Inventario)
                            try (PreparedStatement stmtMov = conn.prepareStatement(sqlMovimiento)) {
                                stmtMov.setInt(1, idIngrediente);
                                stmtMov.setDouble(2, totalADescontar);
                                stmtMov.setString(3, "Reserva/Producción Pedido #" + idPedidoGenerado);
                                stmtMov.setInt(4, usuarioId);
                                stmtMov.executeUpdate();
                            }
                        }
                    }
                }
            }

            // -------------------------------------------------------------
            // PASO C: Generar Ingreso en Finanzas (Si nace como entregado)
            // -------------------------------------------------------------
            if ("entregado".equalsIgnoreCase(estadoFormateado)) {
                try (PreparedStatement psIngreso = conn.prepareStatement(sqlIngreso)) {
                    psIngreso.setInt(1, idPedidoGenerado);
                    psIngreso.setInt(2, idPedidoGenerado);
                    psIngreso.executeUpdate();
                }
            }

            conn.commit(); // ✅ Si todo funcionó sin lanzar excepciones, se confirma la transacción
            return true;

        } catch (SQLException e) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ex) { ex.printStackTrace(); } // 🔄 Revierte todo si hay fallo
            }
            throw e; // Re-lanzamos el error para que el Servlet muestre la alerta de stock
        } finally {
            if (conn != null) {
                try { conn.setAutoCommit(true); conn.close(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
        }
    }

    // 2. OBTENER TODOS LOS PEDIDOS CON DATOS DEL CLIENTE Y PRODUCTO PRINCIPAL
    public List<Pedido> obtenerTodos() {
        List<Pedido> lista = new ArrayList<>();
        String sql = "SELECT p.*, c.nombre AS nombre_cliente, MAX(prod.nombre) AS nombre_producto " +
                     "FROM Pedido p " +
                     "JOIN Cliente c ON p.cliente_id = c.id " +
                     "LEFT JOIN Detalle_Pedido dp ON p.id = dp.pedido_id " +
                     "LEFT JOIN Producto prod ON dp.producto_id = prod.id " +
                     "GROUP BY p.id " +
                     "ORDER BY p.id DESC";

        try (Connection con = ConexionBD.getConexion();
             Statement st = con.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                Pedido p = new Pedido();
                p.setId(rs.getInt("id"));
                p.setClienteId(rs.getInt("cliente_id"));
                p.setUsuarioId(rs.getInt("usuario_id"));
                p.setEstado(rs.getString("estado"));
                p.setTotal(rs.getDouble("total"));
                p.setNotas(rs.getString("notas")); 
                p.setFechaEntrega(rs.getString("fecha_entrega"));
                p.setCreatedAt(rs.getString("created_at"));
                p.setNombreCliente(rs.getString("nombre_cliente"));
                p.setNombreProducto(rs.getString("nombre_producto")); 
                
                lista.add(p);
            }
        } catch (SQLException e) {
            System.err.println("ERROR SQL al listar pedidos: " + e.getMessage());
            e.printStackTrace();
        }
        return lista;
    }

    // 3. OBTENER EL DETALLE COMPLETO DE UN PEDIDO ESPECÍFICO
    public List<DetallePedido> obtenerDetallePorPedido(int idPedido) {
        List<DetallePedido> lista = new ArrayList<>();
        String sql = "SELECT dp.*, pr.nombre AS nombre_producto " +
                     "FROM Detalle_Pedido dp " +
                     "JOIN Producto pr ON dp.producto_id = pr.id " +
                     "WHERE dp.pedido_id = ?";

        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, idPedido);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    DetallePedido dp = new DetallePedido();
                    dp.setId(rs.getInt("id"));
                    dp.setPedidoId(rs.getInt("pedido_id"));
                    dp.setProductoId(rs.getInt("producto_id"));
                    dp.setCantidad(rs.getInt("cantidad"));
                    dp.setPrecioUnitario(rs.getDouble("precio_unitario"));
                    dp.setSubtotal(rs.getDouble("subtotal"));
                    dp.setNombreProducto(rs.getString("nombre_producto"));
                    lista.add(dp);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    // 4. ACTUALIZAR EL ESTADO DE UN PEDIDO (Y generar Ingreso automático si es 'entregado')
    public boolean actualizarEstado(int idPedido, String nuevoEstado) {
        String estadoLimpio = (nuevoEstado != null) ? nuevoEstado.replace("\"", "").trim() : "";

        String sqlUpdate = "UPDATE Pedido SET estado = ? WHERE id = ?";
        String sqlIngreso = "INSERT INTO Ingreso (concepto, monto, fecha, pedido_id) " +
                            "SELECT CONCAT('Pedido #', p.id, ' - ', COALESCE(c.nombre, 'Cliente Directo')), " +
                            "       p.total, CURRENT_DATE(), p.id " +
                            "FROM Pedido p " +
                            "LEFT JOIN Cliente c ON p.cliente_id = c.id " +
                            "WHERE p.id = ? " +
                            "AND NOT EXISTS (SELECT 1 FROM Ingreso WHERE pedido_id = ?)";

        Connection con = null;
        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false); // Iniciamos transacción para asegurar ambas tablas

            // Paso A: Actualizar el estado del pedido
            try (PreparedStatement psUpdate = con.prepareStatement(sqlUpdate)) {
                psUpdate.setString(1, estadoLimpio);
                psUpdate.setInt(2, idPedido);
                psUpdate.executeUpdate();
            }

            // Paso B: Si cambió a 'entregado', registrar el dinero en Finanzas
            if ("entregado".equalsIgnoreCase(estadoLimpio)) {
                try (PreparedStatement psIngreso = con.prepareStatement(sqlIngreso)) {
                    psIngreso.setInt(1, idPedido);
                    psIngreso.setInt(2, idPedido);
                    psIngreso.executeUpdate();
                }
            }

            con.commit();
            return true;

        } catch (SQLException e) {
            System.err.println("ERROR SQL al actualizar estado de pedido: " + e.getMessage());
            e.printStackTrace();
            if (con != null) {
                try { con.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            return false;
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); con.close(); } catch (SQLException e) { e.printStackTrace(); }
            }
        }
    }

    // 5. ACTUALIZAR UN PEDIDO COMPLETO (Transaccional)
    public boolean actualizarPedido(Pedido pedido) {
        String sqlPedido = "UPDATE Pedido SET cliente_id = ?, estado = ?, total = ?, notas = ?, fecha_entrega = ? WHERE id = ?";
        String sqlBorrarDetalles = "DELETE FROM Detalle_Pedido WHERE pedido_id = ?";
        String sqlInsertarDetalle = "INSERT INTO Detalle_Pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)";
        String sqlIngreso = "INSERT INTO Ingreso (concepto, monto, fecha, pedido_id) " +
                            "SELECT CONCAT('Pedido #', p.id, ' - ', COALESCE(c.nombre, 'Cliente Directo')), " +
                            "       p.total, CURRENT_DATE(), p.id " +
                            "FROM Pedido p " +
                            "LEFT JOIN Cliente c ON p.cliente_id = c.id " +
                            "WHERE p.id = ? " +
                            "AND NOT EXISTS (SELECT 1 FROM Ingreso WHERE pedido_id = ?)";

        Connection con = null;
        PreparedStatement psPedido = null;
        PreparedStatement psBorrar = null;
        PreparedStatement psDetalle = null;

        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false); // Transacción estricta

            String estadoLimpio = (pedido.getEstado() != null) ? pedido.getEstado().replace("\"", "").trim() : "";

            // A. Actualizar datos básicos del Pedido
            psPedido = con.prepareStatement(sqlPedido);
            psPedido.setInt(1, pedido.getClienteId());
            psPedido.setString(2, estadoLimpio);
            psPedido.setDouble(3, pedido.getTotal());
            psPedido.setString(4, pedido.getNotas());
            psPedido.setString(5, pedido.getFechaEntrega());
            psPedido.setInt(6, pedido.getId());
            psPedido.executeUpdate();

            // B. Eliminar los detalles anteriores para reescribirlos
            psBorrar = con.prepareStatement(sqlBorrarDetalles);
            psBorrar.setInt(1, pedido.getId());
            psBorrar.executeUpdate();

            // C. Insertar los nuevos detalles actualizados
            if (pedido.getDetalles() != null && !pedido.getDetalles().isEmpty()) {
                psDetalle = con.prepareStatement(sqlInsertarDetalle);
                for (DetallePedido detalle : pedido.getDetalles()) {
                    psDetalle.setInt(1, pedido.getId());
                    psDetalle.setInt(2, detalle.getProductoId());
                    psDetalle.setInt(3, detalle.getCantidad());
                    psDetalle.setDouble(4, detalle.getPrecioUnitario());
                    psDetalle.addBatch();
                }
                psDetalle.executeBatch();
            }

            // D. Si el pedido queda en estado 'entregado', registrar en Finanzas si no estaba
            if ("entregado".equalsIgnoreCase(estadoLimpio)) {
                try (PreparedStatement psIngreso = con.prepareStatement(sqlIngreso)) {
                    psIngreso.setInt(1, pedido.getId());
                    psIngreso.setInt(2, pedido.getId());
                    psIngreso.executeUpdate();
                }
            }

            con.commit(); // Todo fue exitoso
            return true;
        } catch (SQLException e) {
            System.err.println("ERROR SQL al actualizar pedido: " + e.getMessage());
            if (con != null) {
                try { con.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            return false;
        } finally {
            try { if (psPedido != null) psPedido.close(); } catch (SQLException e) {}
            try { if (psBorrar != null) psBorrar.close(); } catch (SQLException e) {}
            try { if (psDetalle != null) psDetalle.close(); } catch (SQLException e) {}
            try { if (con != null) { con.setAutoCommit(true); con.close(); } } catch (SQLException e) {}
        }
    }

    // 6. ELIMINAR PEDIDO, SUS DETALLES E INGRESOS (Transaccional)
    public boolean eliminarPedido(int idPedido) {
        String sqlIngreso = "DELETE FROM Ingreso WHERE pedido_id = ?";
        String sqlDetalles = "DELETE FROM Detalle_Pedido WHERE pedido_id = ?";
        String sqlPedido = "DELETE FROM Pedido WHERE id = ?";

        Connection con = null;
        PreparedStatement psIngreso = null;
        PreparedStatement psDetalles = null;
        PreparedStatement psPedido = null;

        try {
            con = ConexionBD.getConexion();
            con.setAutoCommit(false);

            // A. Eliminar de Ingresos si existía
            psIngreso = con.prepareStatement(sqlIngreso);
            psIngreso.setInt(1, idPedido);
            psIngreso.executeUpdate();

            // B. Eliminar detalles del pedido
            psDetalles = con.prepareStatement(sqlDetalles);
            psDetalles.setInt(1, idPedido);
            psDetalles.executeUpdate();

            // C. Borrar la cabecera del Pedido
            psPedido = con.prepareStatement(sqlPedido);
            psPedido.setInt(1, idPedido);
            int filasAfectadas = psPedido.executeUpdate();

            con.commit();
            return filasAfectadas > 0;
        } catch (SQLException e) {
            System.err.println("ERROR SQL al eliminar pedido: " + e.getMessage());
            if (con != null) {
                try { con.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            return false;
        } finally {
            try { if (psIngreso != null) psIngreso.close(); } catch (SQLException e) {}
            try { if (psDetalles != null) psDetalles.close(); } catch (SQLException e) {}
            try { if (psPedido != null) psPedido.close(); } catch (SQLException e) {}
            try { if (con != null) { con.setAutoCommit(true); con.close(); } } catch (SQLException e) {}
        }
    }
// 7. CREAR PEDIDO + DESCONTAR INVENTARIO + REGISTRAR MOVIMIENTO + FINANZAS (Transaccional)
    public boolean crearPedidoConDescuentoInventario(Pedido pedido) throws SQLException {
        String sqlPedido = "INSERT INTO Pedido (cliente_id, usuario_id, estado, total, notas, fecha_entrega) VALUES (?, ?, ?, ?, ?, ?)";
        String sqlDetalle = "INSERT INTO Detalle_Pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)";
        
        // Consultas de Inventario
        String sqlReceta = "SELECT ingrediente_id, cantidad_requerida FROM Receta WHERE producto_id = ?";
        String sqlStockActual = "SELECT nombre, stock_actual FROM Ingrediente WHERE id = ?";
        String sqlDescontarStock = "UPDATE Ingrediente SET stock_actual = stock_actual - ? WHERE id = ?";
        String sqlMovimiento = "INSERT INTO Movimiento_Inventario (ingrediente_id, tipo, cantidad, motivo, usuario_id) VALUES (?, 'salida', ?, ?, ?)";
        
        // Consulta de Finanzas
        String sqlIngreso = "INSERT INTO Ingreso (concepto, monto, fecha, pedido_id) " +
                            "SELECT CONCAT('Pedido #', p.id, ' - ', COALESCE(c.nombre, 'Cliente Directo')), " +
                            "       p.total, CURRENT_DATE(), p.id " +
                            "FROM Pedido p " +
                            "LEFT JOIN Cliente c ON p.cliente_id = c.id " +
                            "WHERE p.id = ? AND NOT EXISTS (SELECT 1 FROM Ingreso WHERE pedido_id = ?)";

        Connection conn = null;

        try {
            conn = ConexionBD.getConexion(); 
            conn.setAutoCommit(false); // 🔒 INICIO DE TRANSACCIÓN

            // 1. Insertar la cabecera del Pedido
            int idPedidoGenerado = 0;
            String estadoFormateado = (pedido.getEstado() == null || pedido.getEstado().trim().isEmpty()) 
                    ? "nuevo" 
                    : pedido.getEstado().replace("\"", "").trim();

            int usuarioId = pedido.getUsuarioId() > 0 ? pedido.getUsuarioId() : 1;

            try (PreparedStatement stmtPedido = conn.prepareStatement(sqlPedido, Statement.RETURN_GENERATED_KEYS)) {
                stmtPedido.setInt(1, pedido.getClienteId());
                stmtPedido.setInt(2, usuarioId);
                stmtPedido.setString(3, estadoFormateado);
                stmtPedido.setDouble(4, pedido.getTotal());
                stmtPedido.setString(5, pedido.getNotas());
                stmtPedido.setString(6, pedido.getFechaEntrega());
                stmtPedido.executeUpdate();

                ResultSet rsKeys = stmtPedido.getGeneratedKeys();
                if (rsKeys.next()) {
                    idPedidoGenerado = rsKeys.getInt(1);
                } else {
                    throw new SQLException("No se pudo obtener el ID del pedido generado.");
                }
            }

            // 2. Procesar Detalle, Validar Stock y Descontar Inventario
            if (pedido.getDetalles() != null) {
                for (DetallePedido dp : pedido.getDetalles()) {

                    // 2.1 Guardar Detalle
                    try (PreparedStatement stmtDetalle = conn.prepareStatement(sqlDetalle)) {
                        stmtDetalle.setInt(1, idPedidoGenerado);
                        stmtDetalle.setInt(2, dp.getProductoId());
                        stmtDetalle.setInt(3, dp.getCantidad());
                        stmtDetalle.setDouble(4, dp.getPrecioUnitario());
                        stmtDetalle.executeUpdate();
                    }

                    // 2.2 Consultar Receta del Producto
                    try (PreparedStatement stmtReceta = conn.prepareStatement(sqlReceta)) {
                        stmtReceta.setInt(1, dp.getProductoId());
                        ResultSet rsReceta = stmtReceta.executeQuery();

                        while (rsReceta.next()) {
                            int idIngrediente = rsReceta.getInt("ingrediente_id");
                            double cantPorUnidad = rsReceta.getDouble("cantidad_requerida");
                            double totalADescontar = cantPorUnidad * dp.getCantidad();

                            // 2.3 Verificar Stock suficiente
                            try (PreparedStatement stmtStock = conn.prepareStatement(sqlStockActual)) {
                                stmtStock.setInt(1, idIngrediente);
                                ResultSet rsStock = stmtStock.executeQuery();

                                if (rsStock.next()) {
                                    String nombreIng = rsStock.getString("nombre");
                                    double stockActual = rsStock.getDouble("stock_actual");

                                    if (stockActual < totalADescontar) {
                                        throw new SQLException("Stock insuficiente de '" + nombreIng + 
                                              "'. Requerido: " + totalADescontar + ", Disponible: " + stockActual);
                                    }
                                }
                            }

                            // 2.4 Restar Stock del Ingrediente
                            try (PreparedStatement stmtDescuento = conn.prepareStatement(sqlDescontarStock)) {
                                stmtDescuento.setDouble(1, totalADescontar);
                                stmtDescuento.setInt(2, idIngrediente);
                                stmtDescuento.executeUpdate();
                            }

                            // 2.5 Registrar Movimiento de Auditoría
                            try (PreparedStatement stmtMov = conn.prepareStatement(sqlMovimiento)) {
                                stmtMov.setInt(1, idIngrediente);
                                stmtMov.setDouble(2, totalADescontar);
                                stmtMov.setString(3, "Venta Pedido #" + idPedidoGenerado);
                                stmtMov.setInt(4, usuarioId);
                                stmtMov.executeUpdate();
                            }
                        }
                    }
                }
            }

            // 3. Registrar Ingreso Financiero (Si nace como entregado)
            if ("entregado".equalsIgnoreCase(estadoFormateado)) {
                try (PreparedStatement psIngreso = conn.prepareStatement(sqlIngreso)) {
                    psIngreso.setInt(1, idPedidoGenerado);
                    psIngreso.setInt(2, idPedidoGenerado);
                    psIngreso.executeUpdate();
                }
            }

            conn.commit(); // ✅ Guardado completo y consistente
            return true;

        } catch (SQLException e) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            throw e; 
        } finally {
            if (conn != null) {
                try { conn.setAutoCommit(true); conn.close(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
        }
    }
}