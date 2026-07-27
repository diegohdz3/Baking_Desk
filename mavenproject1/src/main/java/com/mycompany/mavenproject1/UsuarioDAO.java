package com.mycompany.mavenproject1;

import org.mindrot.jbcrypt.BCrypt;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class UsuarioDAO {

    // Método que devuelve un LoginResponse si es exitoso, o null si falla
    public LoginResponse autenticarUsuario(String username, String passwordPlana) {
        // Asumo que tu clase ConexionBD tiene un método estático conectar() o getConnection()
        // Ajusta "ConexionBD.getConnection()" según cómo lo tengas programado
        String query = "SELECT u.nombre, u.password_hash, u.activo, r.nombre AS rol_nombre " +
                       "FROM Usuario u " +
                       "INNER JOIN Rol r ON u.rol_id = r.id " +
                       "WHERE u.username = ?";

        try (Connection conn = ConexionBD.getConexion(); 
             PreparedStatement stmt = conn.prepareStatement(query)) {
            
            stmt.setString(1, username);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                boolean activo = rs.getBoolean("activo");
                String passwordHash = rs.getString("password_hash");
                String nombreReal = rs.getString("nombre");
                String nombreRol = rs.getString("rol_nombre");

                // Verificamos que esté activo y que la contraseña coincida
                if (activo && BCrypt.checkpw(passwordPlana, passwordHash)) {
                    return new LoginResponse(nombreReal, username, nombreRol);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        return null; // Si no existe, está inactivo o la contraseña está mal
    }
}