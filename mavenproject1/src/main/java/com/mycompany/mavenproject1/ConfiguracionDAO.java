package com.mycompany.mavenproject1;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import org.mindrot.jbcrypt.BCrypt;

public class ConfiguracionDAO {

    // 1. Obtener Configuración General
    public Configuracion obtenerConfiguracion() {
        String sql = "SELECT id, nombre_negocio, datos_generales FROM Configuracion WHERE id = 1";
        try (Connection conn = ConexionBD.getConexion(); // <-- Corregido: getConexion()
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return new Configuracion(
                    rs.getInt("id"), 
                    rs.getString("nombre_negocio"), 
                    rs.getString("datos_generales")
                );
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    // 2. Actualizar Configuración General
    public boolean actualizarConfiguracion(Configuracion config) {
        String sql = "UPDATE Configuracion SET nombre_negocio = ?, datos_generales = ? WHERE id = 1";
        try (Connection conn = ConexionBD.getConexion(); // <-- Corregido: getConexion()
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, config.getNombreNegocio());
            stmt.setString(2, config.getDatosGenerales());
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    // 3. Cambiar contraseña verificando Hash previo con BCrypt
    public int cambiarContrasena(int usuarioId, String actual, String nueva) {
        String sqlSelect = "SELECT password_hash FROM Usuario WHERE id = ?";
        String sqlUpdate = "UPDATE Usuario SET password_hash = ? WHERE id = ?";
        
        try (Connection conn = ConexionBD.getConexion()) { // <-- Corregido: getConexion()
            // Verificar contraseña actual
            try (PreparedStatement stmt = conn.prepareStatement(sqlSelect)) {
                stmt.setInt(1, usuarioId);
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        String hashActual = rs.getString("password_hash");
                        // Si la contraseña actual no coincide con el Hash de la BD, retorna 0
                        if (hashActual == null || !BCrypt.checkpw(actual, hashActual)) {
                            return 0; 
                        }
                    } else {
                        return 0; // Usuario no encontrado
                    }
                }
            }
            
            // Actualizar a la nueva contraseña aplicando un nuevo Hash con BCrypt
            try (PreparedStatement stmt = conn.prepareStatement(sqlUpdate)) {
                stmt.setString(1, BCrypt.hashpw(nueva, BCrypt.gensalt()));
                stmt.setInt(2, usuarioId);
                return stmt.executeUpdate() > 0 ? 1 : -1; 
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }

    // 4. Obtener las Sesiones Activas
    public List<Sesion> obtenerSesionesActivas(int usuarioId) {
        List<Sesion> lista = new ArrayList<>();
        String sql = "SELECT id, usuario_id, token, ip_address, activa FROM Sesion WHERE usuario_id = ? AND activa = TRUE";
        
        try (Connection conn = ConexionBD.getConexion(); // <-- Corregido: getConexion()
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, usuarioId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Sesion s = new Sesion();
                    s.setId(rs.getInt("id"));
                    s.setUsuarioId(rs.getInt("usuario_id"));
                    s.setToken(rs.getString("token"));
                    s.setIpAddress(rs.getString("ip_address"));
                    s.setActiva(rs.getBoolean("activa"));
                    lista.add(s);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    // 5. Eliminar Sesión Individual
    public boolean cerrarSesionEspecifica(int sesionId, int usuarioId) {
        String sql = "UPDATE Sesion SET activa = FALSE, cerrada_at = CURRENT_TIMESTAMP WHERE id = ? AND usuario_id = ?";
        try (Connection conn = ConexionBD.getConexion(); // <-- Corregido: getConexion()
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, sesionId);
            stmt.setInt(2, usuarioId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    // 6. Eliminar Todas las Otras Sesiones
    public boolean cerrarOtrasSesiones(int usuarioId, String tokenActual) {
        String sql = "UPDATE Sesion SET activa = FALSE, cerrada_at = CURRENT_TIMESTAMP WHERE usuario_id = ? AND token != ? AND activa = TRUE";
        try (Connection conn = ConexionBD.getConexion(); // <-- Corregido: getConexion()
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, usuarioId);
            stmt.setString(2, tokenActual);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
}