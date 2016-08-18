//#define _WIN32_WINNT 0x0602
//#define NTDDI_VERSION NTDDI_WIN8

#include <iostream>

#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

#include <boost/chrono.hpp>

#include <string>
#include <sstream>
#include <vector>
#include <map>

std::vector<std::string> &split(const std::string &s, std::vector<std::string> &elems) {
  std::stringstream ss(s);
  std::string item;
  while (std::getline(ss, item, ' ')) {
    elems.push_back(item);
  }
  return elems;
}


typedef websocketpp::server<websocketpp::config::asio> server;

namespace quokka {

  float SPEED = 0.5f;

  struct PlayerMessage {
    unsigned int _id = 0;
    bool _up = false;
    bool _down = false;
    bool _left = false;
    bool _right = false;
  };

  struct Player {
    float x = 0.f;
    float y = 0.f;
    void clamp() {
      x = x > 1 ? 1 : x < -1 ? -1 : x;
      y = y > 1 ? 1 : y < -1 ? -1 : y;
    }
  };

  struct World {
    Player players[16];
  };

  struct Connection {
    unsigned int _id = 0;
    boost::chrono::system_clock::time_point last_time;
  };


  struct Server {

    void receive_connection_request(websocketpp::connection_hdl hdl) {
      _connections[hdl]._id = _cur_conn_count;
      _cur_conn_count++;
    }

    void receive_message(websocketpp::connection_hdl hdl, std::string message) {      
      std::vector<std::string> words;
      split(message, words);
      int x = std::stoi(words[0]);
      int y = std::stoi(words[1]);
      boost::chrono::system_clock::time_point cur_time = boost::chrono::system_clock::now();      
      boost::chrono::duration<double> sec = cur_time - _connections[hdl].last_time;
      _connections[hdl].last_time = cur_time;
      _world.players[_connections[hdl]._id].x += sec.count()*SPEED*x;
      _world.players[_connections[hdl]._id].y += sec.count()*SPEED*y;
      _world.players[_connections[hdl]._id].clamp();
    }
    
    void send_player_state(unsigned int id) {

    }
    std::string world_to_string() {
      std::string state = "";
      for (int i = 0; i < _cur_conn_count; i++)
        state = state + std::to_string(_world.players[i].x) + " " + std::to_string(_world.players[i].y) + " ";
      return state;
    }

    static const unsigned int CONNECTION_NUM_MAX = 16;
    unsigned int _cur_conn_count = 0;
    World _world;
    typedef std::map<websocketpp::connection_hdl, Connection, std::owner_less<websocketpp::connection_hdl>> con_list;
    con_list _connections;
    
    server _game_server;
    static Server inst;
  };
}

quokka::Server quokka::Server::inst;

void on_message(websocketpp::connection_hdl hdl, server::message_ptr msg) {
  std::cout << msg->get_payload() << std::endl;
  if (msg->get_payload() == "handshake") {
    auto con = quokka::Server::inst._game_server.get_con_from_hdl(hdl);
    quokka::Server::inst.receive_connection_request(hdl);
    con->send(quokka::Server::inst.world_to_string());
  } else {
    quokka::Server::inst.receive_message(hdl, msg->get_payload());    
    auto con = quokka::Server::inst._game_server.get_con_from_hdl(hdl);
    con->send(quokka::Server::inst.world_to_string());
  }
}

int main() {
  quokka::Server::inst._game_server.set_message_handler(&on_message);
                  
  quokka::Server::inst._game_server.init_asio();
  quokka::Server::inst._game_server.listen(9002);
  quokka::Server::inst._game_server.start_accept();    
                  
  quokka::Server::inst._game_server.run();
}

