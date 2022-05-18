import js
import os
import asyncio
import traceback
from pyodide import to_js, create_proxy

from octopwn.octopwn import OctoPwnInteractive
from octopwn.common.screenhandler import ScreenHandlerBase

octopwnApp = None

class Dummy:
	def __init__(self):
		self.completer = None

def gettb4exc(exc):
	# helping javascript to get the string representation of the traceback 
	# when a python exception happens
	return '\r\n'.join(traceback.format_tb(exc.__traceback__))

class ScreenHandlerGoldenLayout:
	def __init__(self):
		self.multi_window_support = True
		self.octopwn = None
		self.targetstable_id = 'targetTable'
		self.proxytable_id = 'proxyTable'
		self.credentialtable_id = 'credentialTable'
		self.clienttable_id = 'clientTable'
		self.consoleoutput_base_id = 'consoleoutput-%s'
		self.input_handler = None
		self.credrefresh_task = None
		self.targetrefresh_task = None
		#this is to be removed...
		self.input_area = Dummy()
	
	async def print_client_msg(self, clientid:int, msg:str):
		try:
			window = js.document.getElementById(self.consoleoutput_base_id % clientid)
			window.innerHTML += '%s\n' % msg
			window.scrollTop = window.scrollHeight
			if clientid != 0:
				js.signalClientMessage(clientid+1)
			
			return True, None
		except Exception as e:
			return None, e

	async def print_main_window(self, msg):
		await self.print_client_msg(0, msg)

	async def clear_main_window(self):
		window = js.document.getElementById(self.consoleoutput_base_id % '0')
		window.innerHTML = ''
	
	async def client_added(self, cid, client):
		# the create_client_window does everything for us
		return True, None

	async def refresh_clients(self):
		js.ClearDataTable('#' + self.clienttable_id)
		js.AddDataTableEntryP4(
			'#' + self.clienttable_id,
			'0',
			'MAIN',
			'MAIN CONSOLE',
			'',
		)
		js.AddDataTableEntryP4(
			'#' + self.clienttable_id,
			'-1',
			'PYTHON',
			'Python interpreter',
			'',
		)

		for cid in self.octopwn.clients:
			clientsettings, client = self.octopwn.clients[cid]
			if clientsettings is None:
				continue
			js.AddDataTableEntryP4(
				'#' + self.clienttable_id,
				str(cid),
				str(clientsettings.clientname),
				str(clientsettings.description) if clientsettings.description is not None else '',
				'',
			)

		return True, None
	
	async def target_added(self, tid, target):
		"""Called when a new target has been added"""
		try:
			if target.hidden is True:
				return
			js.AddDataTableEntryP6(
				'#' + self.targetstable_id, 
				str(tid), 
				str(target.to_compact()), 
				str(target.dcip), 
				str(target.realm),
				str(target.description) if target.description is not None else '',
				str(target.to_line())
			)
			return True, None
		except Exception as e:
			return None, e

	async def __refresh_targets(self):
		await asyncio.sleep(1)
		js.ClearDataTable('#' + self.targetstable_id)
		for tid in self.octopwn.targets:
			await self.target_added(tid, self.octopwn.targets[tid])
		self.targetrefresh_task = None

	async def refresh_targets(self):
		try:
			if self.targetrefresh_task is None:
				self.targetrefresh_task = asyncio.create_task(self.__refresh_targets())	
			return True, None
		except Exception as e:
			print(e)
			return None, e

	async def refresh_proxies(self):
		try:
			js.ClearDataTable('#' + self.proxytable_id)
			for tid in self.octopwn.proxies:
				await self.proxy_added(tid, self.octopwn.proxies[tid])
			return True, None
		except Exception as e:
			print(e)
			return None, e
	
	async def proxy_added(self, pid, proxy):
		"""Add a proxy entry to the proxies window"""
		try:
			if proxy.ptype != 'CHAIN':
				js.AddDataTableEntryP5(
					'#' + self.proxytable_id, 
					str(pid), 
					str(proxy.ip) + ':' + str(proxy.port), 
					str(proxy.ptype),
					str(proxy.description) if proxy.description is not None else '',
					str(proxy.to_line())
				)
			else:
				js.AddDataTableEntryP5(
					'#' + self.proxytable_id, 
					str(pid), 
					str(','.join([str(x) for x in proxy.chain])),
					str(proxy.ptype),
					str(proxy.description) if proxy.description is not None else '',
					str(proxy.to_line())
				)
			
			return True, None
		except Exception as e:
			traceback.print_exc()
			return None, e

	async def __refresh_creds(self):
		await asyncio.sleep(1)
		js.ClearDataTable('#' + self.credentialtable_id)
		for tid in self.octopwn.credentials:
			await self.credential_added(tid, self.octopwn.credentials[tid])
		self.credrefresh_task = None

	async def refresh_credentials(self):
		try:
			if self.credrefresh_task is None:
				self.credrefresh_task = asyncio.create_task(self.__refresh_creds())	
			return True, None
		except Exception as e:
			return None, e

	async def credential_added(self, cid, credential):
		try:
			if credential.hidden is True:
				return
			js.AddDataTableEntryP8(
				'#' + self.credentialtable_id,
				str(cid),
				str(credential.to_line()),
				str(credential.domain),
				str(credential.username),
				str(credential.secret),
				str(credential.stype),
				str(credential.description) if credential.description is not None else '',
				str(credential.to_line(truncate=False))
			)
			return True, None
		except Exception as e:
			print(e)
			return None, e

	async def set_input_dialog_title(self, clientid, title):
		return
	
	async def set_message_dialog_title(self, clientid:int, title:str):
		return
	
	def abort(self, event = None):
		return
	
	async def create_client_window(self, clientid:int, cliname:str, client_settings, client):
		try:
			cproxy = create_proxy(client)
			if client is None:
				cproxy = None
			if client_settings is None:
				js.addNewClientWindow(
					int(clientid), 
					'????',
					'', 
					cproxy
				)
			else:
				js.addNewClientWindow(
					int(clientid), 
					client_settings.clientname,
					str(client_settings.description) if client_settings.description is not None else '', 
					cproxy
				)
			return True, None
		except Exception as e:
			print(e)
			return False, e
	
	async def create_rdp_canvas(self, client_id, cliname, width, height, mouse_cb, keyboard_cb, paste_cb):
		try:
			js.addNewRDPCanvasWindow(str(client_id), str(cliname), str(width), str(height), mouse_cb, keyboard_cb, paste_cb)
			return True, None
		except Exception as e:
			return None, e
	
	async def update_rdp_canvas(self, client_id, image, x, y, width, height):
		try:
			js.updateRDPCanvas(client_id, image, x, y, width, height)
			return True, None
		except Exception as e:
			print(e)
			return None, e

	async def create_graph_canvas(self, client_id, graphid, path_calc_cb, node_set_cb, node_search_cb):
		try:
			js.addNewGraphCanvasWindow(str(client_id), str(graphid), path_calc_cb, node_set_cb, node_search_cb)
			return True, None
		except Exception as e:
			return None, e

	async def update_graph_canvas(self, client_id, graphid, graphdata_json):
		try:
			js.updateGraphCanvas(str(client_id), str(graphid), graphdata_json)
			return True, None
		except Exception as e:
			return None, e

	async def runtask(self):
		while True:
			await asyncio.sleep(1000)
			
	async def run(self, octopwn, input_handler = None):
		self.octopwn = octopwn
		self.input_handler = input_handler
		return asyncio.create_task(self.runtask()), None

async def start():
	try:
		global octopwnApp
		# setting the current directory
		os.chdir("/volatile/")

		screen = ScreenHandlerGoldenLayout()
		# checking if a session file exists
		sessionfile = '/static/octopwn.session'
		sessionfile_temp = '/static/octopwn.session.temp'

		newsession = True
		for filename in [sessionfile, sessionfile_temp]:
			try:
				js.loadingScreenMessage("Trying to load session file %s" % filename)
				with open(filename, 'rb') as f:
					a = 1
				js.loadingScreenMessage("It seems there is already a session file here. Trying to load it!")
				octopwnApp = OctoPwnInteractive.load(filename, screen, work_dir = '/static/', periodic_save = True)
				js.loadingScreenMessage("Session restore ok!")
				newsession = False
				break
			except Exception as e:
				js.loadingScreenMessage("Loading session file failed! Reason: %s" % str(e))
		else:
			js.loadingScreenMessage("Either no session file or it is corrupt, let the past die kill it if you have to...")
			octopwnApp = OctoPwnInteractive(screen, work_dir = '/static/', periodic_save = True)

		apprunner, err = await octopwnApp.run()
		if err is not None:
			raise err

		if newsession is True:
			# the ip/port doesnt matter, those params are not used in this protocol
			_,_,err = await octopwnApp.do_addproxy('WSNET', '127.0.0.1', 8700)
			if err is not None:
				raise err
			await octopwnApp.do_createutil('PYPYKATZ')


		await asyncio.sleep(0)
	except Exception as e:
		js.stopLoadingScreenError(str(e))
		traceback.print_exc()

await start()
